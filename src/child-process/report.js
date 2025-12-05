process.on('message', async (message) => {
    if (message.action === "generate_business_listing_summary") {
        console.log("Generating business listing summary in child process...");
        let summary = {
            total: message.data.clinics.length + message.data.doctors.length,
            clinics: 0,
            partnered_clinics: 0,
            public_listing_clinics: 0,
            partner_clinics_notupdated_since_15_days: 0,
            partner_clinics_notupdate_since_7_days: 0,

            doctors: 0,
            partnered_doctors: 0,
            public_listing_doctors: 0,
            partnered_doctors_notupdated_since_15_days: 0,
            partnered_doctors_notupdated_since_7_days: 0,

            individual_doctors: 0,
            labs: 0,
            partnered_labs: 0,
            public_listing_labs: 0,
            partnered_labs_notupdated_since_15_days: 0,
            partnered_labs_notupdated_since_7_days: 0,

            petcare_clinics: 0,
            partnered_petcare_clinics: 0,
            public_listing_petcare_clinics: 0,
            partnered_petcare_clinics_notupdated_since_15_days: 0,
            partnered_petcare_clinics_notupdated_since_7_days: 0,

            petcare_doctors: 0,
            partnered_petcare_doctors: 0,
            public_listing_petcare_doctors: 0,
            partnered_petcare_doctors_notupdated_since_15_days: 0,
            partnered_petcare_doctors_notupdated_since_7_days: 0,

            medicine_stores: 0,
            partnered_medicine_stores: 0,
            public_listing_medicine_stores: 0,
            partnered_medicine_stores_notupdated_since_15_days: 0,
            partnered_medicine_stores_notupdated_since_7_days: 0,

            caretaker_providers: 0,
            partnered_caretaker_providers: 0,
            public_listing_caretaker_providers: 0,
            partnered_caretaker_providers_notupdated_since_15_days: 0,
            partnered_caretaker_providers_notupdated_since_7_days: 0,

            caretakers: 0,
            partnered_caretakers: 0,
            public_listing_caretakers: 0,
            partnered_caretakers_notupdated_since_15_days: 0,
            partnered_caretakers_notupdated_since_7_days: 0,

            massage_centers: 0,
            partnered_massage_centers: 0,
            public_listing_massage_centers: 0,
            partnered_massage_centers_notupdated_since_15_days: 0,
            partnered_massage_centers_notupdated_since_7_days: 0,

            massage_therapists: 0,
            partnered_massage_therapists: 0,
            public_listing_massage_therapists: 0,
            partnered_massage_therapists_notupdated_since_15_days: 0,
            partnered_massage_therapists_notupdated_since_7_days: 0,

            physiotherapy_centers: 0,
            partnered_physiotherapy_centers: 0,
            public_listing_physiotherapy_centers: 0,
            partnered_physiotherapy_centers_notupdated_since_15_days: 0,
            partnered_physiotherapy_centers_notupdated_since_7_days: 0,

            physiotherapists: 0,
            partnered_physiotherapists: 0,
            public_listing_physiotherapists: 0,
            partnered_physiotherapists_notupdated_since_15_days: 0,
            partnered_physiotherapists_notupdated_since_7_days: 0,
        };
        let current_time = new Date(message.data.current_time);
        for (let clinic of message.data.clinics) {
            let last_update = new Date(clinic.last_update_time);
            let days_diff = Math.floor((current_time.getTime() - last_update.getTime()) / (1000 * 60 * 60 * 24));
            if (clinic.business_type === "CLINIC") {
                summary.clinics++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_clinics++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_clinics++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partner_clinics_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partner_clinics_notupdated_since_15_days++;
                    }
                }
            } else if (clinic.business_type === "TESTSCAN") {
                summary.labs++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_labs++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_labs++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_labs_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_labs_notupdated_since_15_days++;
                    }
                }
            } else if (clinic.business_type === "PETCARE") {
                summary.petcare_clinics++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_petcare_clinics++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_petcare_clinics++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_petcare_clinics_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_petcare_clinics_notupdated_since_15_days++;
                    }
                }
            } else if (clinic.business_type === "MEDICINESTORE") {
                summary.medicine_stores++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_medicine_stores++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_medicine_stores++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_medicine_stores_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_medicine_stores_notupdated_since_15_days++;
                    }
                }
            } else if (clinic.business_type === "CARETAKER") {
                summary.caretaker_providers++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_caretaker_providers++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_caretaker_providers++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_caretaker_providers_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_caretaker_providers_notupdated_since_15_days++;
                    }
                }
            } else if (clinic.business_type === "RELAXATION") {
                summary.massage_centers++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_massage_centers++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_massage_centers++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_massage_centers_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_massage_centers_notupdated_since_15_days++;
                    }
                }
            } else if (clinic.business_type === "PHYSIOTHERAPY") {
                summary.physiotherapy_centers++;
                if (clinic.partner_type === "public_listing") {
                    summary.public_listing_physiotherapy_centers++;
                } else if (clinic.partner_type === "partnered") {
                    summary.partnered_physiotherapy_centers++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_physiotherapy_centers_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_physiotherapy_centers_notupdated_since_15_days++;
                    }
                }
            }
        }
        for (let doctor of message.data.doctors) {
            let last_update = new Date(doctor.last_update_time);
            let days_diff = Math.floor((current_time.getTime() - last_update.getTime()) / (1000 * 60 * 60 * 24));
            if (doctor.business_type === "DOCTOR") {
                summary.doctors++;
                if (doctor.partner_type === "public_listing") {
                    summary.public_listing_doctors++;
                } else if (doctor.partner_type === "partnered") {
                    summary.partnered_doctors++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_doctors_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_doctors_notupdated_since_15_days++;
                    }
                }
                if (doctor.clinic_id == 0) {
                    summary.individual_doctors++;
                }
            } else if (doctor.business_type === "PETCARE") {
                summary.petcare_doctors++;
                if (doctor.partner_type === "public_listing") {
                    summary.public_listing_petcare_doctors++;
                } else if (doctor.partner_type === "partnered") {
                    summary.partnered_petcare_doctors++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_petcare_doctors_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_petcare_doctors_notupdated_since_15_days++;
                    }
                }
            } else if (doctor.business_type === "CARETAKER") {
                summary.caretakers++;
                if (doctor.partner_type === "public_listing") {
                    summary.public_listing_caretakers++;
                } else if (doctor.partner_type === "partnered") {
                    summary.partnered_caretakers++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_caretakers_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_caretakers_notupdated_since_15_days++;
                    }
                }
            } else if (doctor.business_type === "RELAXATION") {
                summary.massage_therapists++;
                if (doctor.partner_type === "public_listing") {
                    summary.public_listing_massage_therapists++;
                } else if (doctor.partner_type === "partnered") {
                    summary.partnered_massage_therapists++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_massage_therapists_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_massage_therapists_notupdated_since_15_days++;
                    }
                }
            } else if (doctor.business_type === "PHYSIOTHERAPY") {
                summary.physiotherapists++;
                if (doctor.partner_type === "public_listing") {
                    summary.public_listing_physiotherapists++;
                } else if (doctor.partner_type === "partnered") {
                    summary.partnered_physiotherapists++;
                    if (days_diff >= 7 && days_diff < 15) {
                        summary.partnered_physiotherapists_notupdated_since_7_days++;
                    } else if (days_diff >= 15) {
                        summary.partnered_physiotherapists_notupdated_since_15_days++;
                    }
                }
            }
        }
        process.send && process.send({ status: "done", data: summary });
    }
});