import { pageSettingsModel } from "../../mongo-schema/coll_page_settings";
type TSectionData = {
    heading: string,
    viewType: string,
    enable: boolean,
    spaecialist_id: number[]
}
type THomeSection = {
    _id: string,
    name: string,
    heading: string,
    viewType: string,
    enable: boolean,
    verticals: string[]
}
export type TVertical = {
    label: string,
    name: "doctors" | "clinics" | "medicine" | "caretaker" | "physiotherapy" | "body_massage"
    icons: string,
    url_pattern: string,
    enable: boolean,
}
const settingModel = {
    getPageSettingsData: async (data: { state: string, city: string, page: string }) => {
        let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: data.page.toLowerCase() }).exec();
        return document;
    },
    deleteSection: async (data: { state: string, city: string, page: string, section_id: string }) => {
        await pageSettingsModel.findOneAndUpdate({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: data.page }, {
            $pull: {
                sections: {
                    _id: data.section_id
                }
            }
        }).exec()
    },
    saveHomePageData: async (data: {
        state: string
        city: string,
        specialists?: Array<number>,
        verticals?: Array<TVertical>,
        section?: THomeSection
    }) => {
        if (data.section?._id) {
            await pageSettingsModel.findOneAndUpdate({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "home", 'sections._id': data.section._id }, {
                $set: { "sections.$": data.section },
            }).exec();
            return;
        }
        let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "home" }).select('_id');
        if (document) {
            if (data.section) {
                let { _id, ...sectionData } = data.section
                await pageSettingsModel.updateOne({ _id: document._id }, {
                    $push: {
                        sections: sectionData
                    }
                }).exec();
                return;
            }
            let updateData: any = {};
            if (data.specialists) {
                updateData.specialists = data.specialists;
            }
            if (data.verticals) {
                updateData.verticals = data.verticals;
            }
            console.log('updateData', updateData)
            await pageSettingsModel.updateOne({ _id: document._id }, updateData).exec();
        } else {
            await new pageSettingsModel({
                state: data.state.toLowerCase(),
                city: data.city.toLowerCase(),
                page: "home",
                specialists: data.specialists || [],
                verticals: data.verticals || [],
                sections: data.section ? [data.section] : []
            }).save()
        }
    },
    saveDoctorPageData: async (data: {
        state: string
        city: string,
        popular_specialists: Array<number>,
        sections?: Array<TSectionData>,
        section?: TSectionData & { _id: string }
    }) => {
        if (data.section?._id) {
            await pageSettingsModel.findOneAndUpdate({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "doctors", 'sections._id': data.section._id }, {
                $set: { "sections.$": data.section },
            }).exec();
            return;
        }
        if (data.sections || data.popular_specialists || data.section) {
            let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "doctors" }).select('_id');
            if (document) {
                if (data.section) {
                    let { _id, ...sectionData } = data.section
                    await pageSettingsModel.updateOne({ _id: document._id }, {
                        $push: {
                            sections: sectionData
                        }
                    }).exec();
                    return;
                }
                let updateData: any = {};
                if (data.popular_specialists) {
                    updateData.popular_specialists = data.popular_specialists;
                }
                if (data.sections) {
                    updateData.sections = data.sections;
                }
                await pageSettingsModel.updateOne({ _id: document._id }, updateData).exec();
            } else {
                await new pageSettingsModel({
                    state: data.state.toLowerCase(),
                    city: data.city.toLowerCase(),
                    page: "doctors",
                    popular_specialists: data.popular_specialists,
                    sections: data.sections || []
                }).save()
            }
        }
    },
    saveClinicsPageData: async (data: {
        state: string
        city: string,
        popular_specialists: Array<number>,
        section?: TSectionData & { _id: string }
    }) => {
        if (data.section?._id) {
            await pageSettingsModel.findOneAndUpdate({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "clinics", 'sections._id': data.section._id }, {
                $set: { "sections.$": data.section },
            }).exec();
            return;
        }
        if (data.popular_specialists || data.section) {
            let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "clinics" }).select('_id');
            if (document) {
                if (data.section) {
                    let { _id, ...sectionData } = data.section
                    await pageSettingsModel.updateOne({ _id: document._id }, {
                        $push: {
                            sections: sectionData
                        }
                    }).exec();
                    return;
                }
                let updateData: any = {};
                if (data.popular_specialists) {
                    updateData.popular_specialists = data.popular_specialists;
                }
                await pageSettingsModel.updateOne({ _id: document._id }, updateData).exec();
            } else {
                await new pageSettingsModel({
                    state: data.state.toLowerCase(),
                    city: data.city.toLowerCase(),
                    page: "clinics",
                    popular_specialists: data.popular_specialists,
                    sections: []
                }).save()
            }
        }
    },
    saveCaretakersPageData: async (data: {
        state: string
        city: string,
        popular_specialists: Array<number>,
        section?: TSectionData & { _id: string }
    }) => {
        if (data.section?._id) {
            await pageSettingsModel.findOneAndUpdate({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "caretakers", 'sections._id': data.section._id }, {
                $set: { "sections.$": data.section },
            }).exec();
            return;
        }
        if (data.popular_specialists || data.section) {
            let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "caretakers" }).select('_id');
            if (document) {
                if (data.section) {
                    let { _id, ...sectionData } = data.section
                    await pageSettingsModel.updateOne({ _id: document._id }, {
                        $push: {
                            sections: sectionData
                        }
                    }).exec();
                    return;
                }
                let updateData: any = {};
                if (data.popular_specialists) {
                    updateData.popular_specialists = data.popular_specialists;
                }
                await pageSettingsModel.updateOne({ _id: document._id }, updateData).exec();
            } else {
                await new pageSettingsModel({
                    state: data.state.toLowerCase(),
                    city: data.city.toLowerCase(),
                    page: "caretakers",
                    popular_specialists: data.popular_specialists,
                    sections: []
                }).save()
            }
        }
    },
    savePhysiotherapyPageData: async (data: {
        state: string
        city: string,
        page_name:string,
        popular_specialists: Array<number>,
        section?: TSectionData & { _id: string }
    }) => {
        if (data.section?._id) {
            await pageSettingsModel.findOneAndUpdate({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: data.page_name, 'sections._id': data.section._id }, {
                $set: { "sections.$": data.section },
            }).exec();
            return;
        }
        if (data.popular_specialists || data.section) {
            let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: data.page_name }).select('_id');
            if (document) {
                if (data.section) {
                    let { _id, ...sectionData } = data.section
                    await pageSettingsModel.updateOne({ _id: document._id }, {
                        $push: {
                            sections: sectionData
                        }
                    }).exec();
                    return;
                }
                let updateData: any = {};
                if (data.popular_specialists) {
                    updateData.popular_specialists = data.popular_specialists;
                }
                await pageSettingsModel.updateOne({ _id: document._id }, updateData).exec();
            } else {
                await new pageSettingsModel({
                    state: data.state.toLowerCase(),
                    city: data.city.toLowerCase(),
                    page: data.page_name,
                    popular_specialists: data.popular_specialists,
                    sections: []
                }).save()
            }
        }
    },
    getSiteBannersData: async (data: { city: string }) => {
        let rows = await DB.get_rows("select * from site_banners where city = ? order by page,display_order", [data.city.toLowerCase()]);
        return rows;
    },
    updateSiteBannerData: async (data: {
        city: string,
        id: number,
        device_type: string,
        alt_text: string,
        banner_image_link: string,
        url: string,
        display_order: number,
        enable: boolean
    }) => {

    }
}
export default settingModel;