import { get_current_datetime } from '../../services/datetime';
import { successResponse, internalServerError } from '../../services/response';

export type TAmbulanceRow = {
    id: number,
    clinic_id: number,
    vehicle_no: string,
    vehicle_type: string,
    title: string,
    photo: string,
    driver_name: string,
    driver_mobile: string,
    base_fare: number,
    per_km_charge: number,
    facilities: string,
    /** json array, see TServiceRoute */
    service_routes: string,
    available_24x7: number,
    active: number,
}

/** one leg this vehicle runs, eg Bhadrak -> Cuttack */
export type TServiceRoute = {
    from: string,
    to: string,
    distance_km: number,
    fare: number,
    note: string,
}

export type TSaveAmbulanceParams = {
    id?: number,
    clinic_id: number,
    branch_id: number,
    vehicle_no: string,
    vehicle_type: string,
    title: string,
    driver_name: string,
    driver_mobile: string,
    base_fare: number,
    per_km_charge: number,
    facilities: string,
    service_routes: string,
    available_24x7: number,
    active: number,
    /** only set when a new file was uploaded; left out to keep the stored photo as it is */
    photo?: string,
}

const ambulanceModel = {
    getClinicAmbulances: async (clinic_id: number) => {
        let rows = await DB.get_rows<TAmbulanceRow>(
            "select id,clinic_id,vehicle_no,vehicle_type,title,photo,driver_name,driver_mobile,base_fare,per_km_charge,facilities,service_routes,available_24x7,active from clinic_ambulances where clinic_id=? order by active desc,id desc",
            [clinic_id]
        );
        return successResponse(rows || [], "success");
    },
    getAmbulance: async (id: number) => {
        return await DB.get_row<TAmbulanceRow>("select id,clinic_id,photo from clinic_ambulances where id=?", [id]);
    },
    saveAmbulance: async (params: TSaveAmbulanceParams) => {
        const now = get_current_datetime();
        const columns: { [key: string]: any } = {
            vehicle_no: params.vehicle_no,
            vehicle_type: params.vehicle_type,
            title: params.title,
            driver_name: params.driver_name,
            driver_mobile: params.driver_mobile,
            base_fare: params.base_fare,
            per_km_charge: params.per_km_charge,
            facilities: params.facilities,
            service_routes: params.service_routes,
            available_24x7: params.available_24x7,
            active: params.active,
        };
        if (typeof params.photo === "string") {
            columns.photo = params.photo;
        }
        if (params.id) {
            columns.updated_at = now;
            const setClause = Object.keys(columns).map((c) => `${c}=?`).join(",");
            let res: any = await DB.query(
                `update clinic_ambulances set ${setClause} where id=? and clinic_id=?`,
                [...Object.values(columns), params.id, params.clinic_id]
            );
            if (res) {
                return successResponse({ id: params.id }, "Ambulance updated successfully");
            }
            return internalServerError("something went wrong! try again");
        }
        columns.clinic_id = params.clinic_id;
        columns.branch_id = params.branch_id;
        columns.created_at = now;
        columns.updated_at = now;
        const setClause = Object.keys(columns).map((c) => `${c}=?`).join(",");
        let res: any = await DB.query(
            `insert into clinic_ambulances set ${setClause}`,
            Object.values(columns)
        );
        if (res && res.affectedRows >= 1) {
            return successResponse({ id: res.insertId }, "Ambulance added successfully");
        }
        return internalServerError("something went wrong! try again");
    },
    deleteAmbulance: async (id: number, clinic_id: number) => {
        let res: any = await DB.query("delete from clinic_ambulances where id=? and clinic_id=?", [id, clinic_id]);
        if (res && res.affectedRows >= 1) {
            return successResponse(null, "Ambulance removed successfully");
        }
        return internalServerError("something went wrong! try again");
    }
}
export default ambulanceModel;
