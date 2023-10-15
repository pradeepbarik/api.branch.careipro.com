import { internalServerError, serviceNotAcceptable, successResponse } from '../../services/response';
import { clinicMarketsModel } from '../../mongo-schema/coll_clinic_markets';
import villageMongoModel from '../../mongo-schema/col_village_lists';
export const getMissingVillageList = async ({ state = '', district }: {
    state: '' | string,
    district: string
}) => {
    try {
        let q = "SELECT state,district,sub_district,village,if(district=?,0,1) as prority_dist FROM `tbl_villages_not_listed`";
        let sqlparams = [];
        sqlparams.push(district);
        if (state !== '') {
            q += " where state=?";
            sqlparams.push(state);
        }
        q += "order by prority_dist,district";
        let rows = await DB.get_rows(q, sqlparams);
        return successResponse(rows, "success")
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
export const getClinicAvailableAreas = async (state: string, city: string) => {
    try {
        let document = await clinicMarketsModel.findOne({ state: state.toLowerCase(), city: city.toLowerCase() }).select('state city markets').exec();
        return successResponse(document, "success");
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
type TaddClinicAvailableMarketParams = {
    state: string,
    dist_name: string,
    area_name: string
}
export const addClinicAvailableMarket = async (params: TaddClinicAvailableMarketParams) => {
    try {
        let state = params.state.toLowerCase();
        let city = params.dist_name.toLowerCase();
        let market_name = params.area_name.toLowerCase();
        let clinicMarketDocument = await clinicMarketsModel.findOne({ state: state, city: city }).select('_id state sity').exec();
        if (clinicMarketDocument) {
            await clinicMarketDocument.updateOne({
                $push: {
                    markets: {
                        name: market_name
                    }
                }
            }).exec();
        } else {
            await new clinicMarketsModel({
                state: state,
                city: city,
                markets: [
                    { name: market_name }
                ]
            }).save()
        }
        return successResponse("Market added successfully");
    } catch (err: any) {
        return internalServerError(err.message)
    }
}
const locationModel = {
    addMissedArea: async (params: {
        state: string, district: string, sub_district: string, village: string
    }) => {
        let state = params.state.toLowerCase();
        let district = params.district.toLowerCase();
        let sub_district = params.sub_district.toLowerCase();
        let village = params.village.toLowerCase();
        let document = await villageMongoModel.aggregate([
            {
                $match: {
                    state: state,
                    district: district,
                    sub_district: sub_district
                }
            },
            {
                $project: {
                    _id: 1,
                    state: 1,
                    district: 1,
                    sub_district: 1,
                    villages: {
                        $filter: {
                            input: '$villages',
                            as: "villages",
                            cond: {
                                $eq: ['$$villages.name', village]
                            }
                        }
                    }
                }
            }
        ]);
        if (document.length) {
            if (document[0].villages && document[0].villages.length > 0) {
                return serviceNotAcceptable("Area name already exist");
            }
            await villageMongoModel.updateOne({ _id: document[0]._id }, {
                $push: {
                    villages: {
                        name: village,
                        lgd_code: '',
                        village_status: ''
                    }
                }
            }).exec();
            DB.query("delete from tbl_villages_not_listed where state=? and district=? and sub_district=? and village=?",[state,district,sub_district,village]);
            return successResponse(null, "success");
        }else{
            return serviceNotAcceptable("please add state,district and sub district first");
        }
    },
    rejectAddareaRequest:async (params:{
        state: string, district: string, sub_district: string, village: string
    })=>{
       await DB.query("delete from tbl_villages_not_listed where state=? and district=? and sub_district=? and village=?",[params.state,params.district,params.sub_district,params.village]);
       return successResponse(null, "Removed successfully");
    }
}
export default locationModel;