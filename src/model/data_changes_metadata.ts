import { clinicInfoChangeTrackerModel } from '../mongo-schema/coll_clinic_info_change_trackers';
import {get_current_datetime} from '../services/datetime';
type TchangesInfo = {
    change_type: 'appointment'|'doctor_info'|'clinic_info',
    doctor_id: number,
    table_name: string,
    event_type: string
}
const dataChangesTrackerModel = {
    TrackclinicInfoChanges: async (clinic_id: number, changesInfo: TchangesInfo) => {
        let document = await clinicInfoChangeTrackerModel.findOne({ clinic_id: clinic_id });
        if (!document) {
            let newDocumentProps = {
                clinic_id: clinic_id,
                appointments: [],
                doctors: [],
            };
            let newDocument = new clinicInfoChangeTrackerModel(newDocumentProps)
            document = await newDocument.save();
        }
        if(changesInfo.change_type==='appointment'){
            let now =get_current_datetime();
            await document.updateOne({
                $pull:{
                    appointments:{doctor_id:changesInfo.doctor_id}
                }
            },{multi:true}).exec();
            document.updateOne({
                $push:{
                    appointments:{
                        doctor_id:changesInfo.doctor_id,
                        table:changesInfo.table_name,event_type:changesInfo.event_type,last_update_time:now
                    }
                }
            }).exec();
        }
    }
}
export default dataChangesTrackerModel;