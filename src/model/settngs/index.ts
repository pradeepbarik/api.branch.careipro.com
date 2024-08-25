import { pageSettingsModel } from "../../mongo-schema/coll_page_settings";
type TSectionData = {
    heading: string,
    viewType: string,
    enable: boolean,
    spaecialist_id: number[]
}
const settingModel = {
    getPageSettingsData:async (data:{state:string,city:string,page:string})=>{
        let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: data.page.toLowerCase() }).exec();
        return document;
    },
    saveDoctorPageData: async (data: {
        state: string
        city: string,
        popular_specialists: Array<number>,
        sections?: Array<TSectionData>,
        section?:TSectionData&{_id:string}
    }) => {
        if (data.section) {
           await pageSettingsModel.findOneAndUpdate({state: data.state.toLowerCase(), city: data.city.toLowerCase(),'sections._id':data.section._id},{
                $set: { "sections.$":data.section},
            }).exec();
        }
        if(data.sections){
            let document = await pageSettingsModel.findOne({ state: data.state.toLowerCase(), city: data.city.toLowerCase(), page: "doctors" }).select('_id');
            if (document) {
                let updateData:any={};
                if(data.popular_specialists){
                    updateData.popular_specialists=data.popular_specialists;
                }
                if(data.sections){
                    updateData.sections=data.sections;
                }
                await pageSettingsModel.updateOne({ _id: document._id }, updateData).exec();
            } else {
                await new pageSettingsModel({
                    state: data.state.toLowerCase(),
                    city: data.city.toLowerCase(),
                    page: "doctors",
                    popular_specialists: data.popular_specialists,
                    sections: data.sections
                }).save()
            }
        }
    }
}
export default settingModel;