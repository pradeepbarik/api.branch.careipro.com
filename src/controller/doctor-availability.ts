import { Request, Response } from 'express';
import fs from 'fs';
import { successResponse, unauthorizedResponse } from '../services/response';
import { getCityCacheDir } from '../services/cache-file';
import { get_current_datetime, moment } from '../services/datetime';
import { doctorLogo } from '../helper/imagehelper';

/* one entry of doctors-consulting-timings.json, which api.careipro.com writes once a day
   (/init-doctors-consulting-timings) keyed by service location id */
type TCachedTiming = {
    availability: 'per_week' | 'per_day' | 'per_month' | string,
    doctor_id: number,
    doctor_name: string,
    consult_dates: Array<{
        date: string,
        first_session_start_time?: string | null, first_session_end_time?: string | null,
        second_session_start_time?: string | null, second_session_end_time?: string | null,
        third_session_start_time?: string | null, third_session_end_time?: string | null,
    }>
};

/* the cache already holds display times ("8:00 AM"); a raw "HH:mm:ss" is tolerated in case an
   older file is still around. strict parsing, so "6:00 PM" is never read as 06:00 */
const formatTime = (t?: string | null) => {
    if (!t) return "";
    const value = t.trim();
    if (!value || value === "00:00:00" || value === "00:00") return "";
    const m = moment(value, ["h:mm A", "hh:mm A", "HH:mm:ss", "HH:mm"], true);
    return m.isValid() ? m.format("h:mm A") : value;
};
const sessionLabel = (start?: string | null, end?: string | null) => {
    const s = formatTime(start), e = formatTime(end);
    return s && e ? `${s} - ${e}` : (s || e);
};

const doctorAvailabilityController = {
    /**
     * Who consults on which of the next few days in the logged in branch's city, for employees
     * deciding whose banner to run. Reads the consulting timings cache rather than recomputing,
     * the same file the website uses, and joins in what the cache leaves out: photo, clinic and
     * specialists. per_day doctors carry no dates in the cache, they are open every day.
     */
    getDoctorAvailability: async (req: Request, res: Response) => {
        const { tokenInfo } = res.locals;
        if (typeof tokenInfo === 'undefined') {
            unauthorizedResponse("permission denied! Please login to access", res);
            return;
        }
        const state: string = (tokenInfo.bs || "").toLowerCase();
        const city: string = (tokenInfo.bd || "").toLowerCase();
        const today = get_current_datetime(true);
        const filePath = getCityCacheDir(state, city) + "doctors-consulting-timings.json";

        if (!fs.existsSync(filePath)) {
            res.json(successResponse({ city, today, generated_at: null, doctors: [] }, "Doctor timings are not generated yet for this city"));
            return;
        }
        const generated_at = moment(fs.statSync(filePath).mtime).utcOffset("+05:30").format("YYYY-MM-DD HH:mm:ss");
        let cache: Record<string, TCachedTiming> = {};
        try {
            cache = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
        } catch {
            res.json(successResponse({ city, today, generated_at, doctors: [] }, "Doctor timings file could not be read"));
            return;
        }

        const serviceLocIds = Object.keys(cache).map((id) => parseInt(id)).filter((id) => !isNaN(id));
        if (serviceLocIds.length === 0) {
            res.json(successResponse({ city, today, generated_at, doctors: [] }));
            return;
        }

        const locations = await DB.get_rows<{ service_loc_id: number, doctor_id: number, clinic_id: number, clinic_name: string, place: string, image: string | null, position: string | null, business_type: string }>(
            "select dsl.id as service_loc_id,dsl.doctor_id,dsl.clinic_id,dsl.clinic as clinic_name,dsl.place,doctor.image,doctor.position,doctor.business_type from doctor_service_location as dsl join doctor on dsl.doctor_id=doctor.id where dsl.id in (?)",
            [serviceLocIds.map(String)]
        );
        const doctorIds = Array.from(new Set(locations.map((l) => l.doctor_id)));
        const specialistRows = doctorIds.length ? await DB.get_rows<{ doctor_id: number, id: number, name: string }>(
            "select ds.doctor_id,s.id,s.name from doctor_specialization as ds join specialists as s on ds.specialist=s.id where ds.doctor_id in (?)",
            [doctorIds.map(String)]
        ) : [];
        const specialistsByDoctor: Record<number, Array<{ id: number, name: string }>> = {};
        for (const row of specialistRows) {
            (specialistsByDoctor[row.doctor_id] = specialistsByDoctor[row.doctor_id] || []).push({ id: row.id, name: row.name });
        }
        const locationById: Record<number, typeof locations[number]> = {};
        for (const l of locations) locationById[l.service_loc_id] = l;

        const doctors = [];
        for (const id of serviceLocIds) {
            const entry = cache[id];
            const loc = locationById[id];
            if (!entry || !loc) continue;
            /* the cache is built once a day, so a date that is already past is dropped here */
            const consult_dates = (entry.consult_dates || [])
                .filter((d) => d.date >= today)
                .map((d) => ({
                    date: d.date,
                    sessions: [
                        sessionLabel(d.first_session_start_time, d.first_session_end_time),
                        sessionLabel(d.second_session_start_time, d.second_session_end_time),
                        sessionLabel(d.third_session_start_time, d.third_session_end_time),
                    ].filter(Boolean)
                }));
            const daily = entry.availability === "per_day";
            if (!daily && consult_dates.length === 0) continue;
            // each doctor's own specialists, the page filters on these with its specialist search box
            const specialists = specialistsByDoctor[loc.doctor_id] || [];
            doctors.push({
                service_loc_id: id,
                doctor_id: entry.doctor_id,
                doctor_name: entry.doctor_name,
                doctor_photo: doctorLogo(loc.image),
                position: loc.position || "",
                business_type: loc.business_type,
                clinic_id: loc.clinic_id,
                clinic_name: (loc.clinic_name || "").trim(),
                place: (loc.place || "").trim(),
                availability: entry.availability,
                daily,
                specialists,
                consult_dates
            });
        }
        doctors.sort((a, b) => a.doctor_name.localeCompare(b.doctor_name));
        res.json(successResponse({ city, today, generated_at, doctors }));
    }
}
export default doctorAvailabilityController;
