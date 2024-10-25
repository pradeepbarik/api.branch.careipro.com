import { pageSettingsModel } from "../../mongo-schema/coll_page_settings";
type TSectionData = {
    heading: string,
    viewType: string,
    enable: boolean,
    spaecialist_id: number[]
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
    }

}
export default settingModel;