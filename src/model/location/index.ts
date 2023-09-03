import { internalServerError, serviceNotAcceptable, successResponse } from '../../services/response';
import { clinicMarketsModel } from '../../mongo-schema/coll_clinic_markets';
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
        let state=params.state.toLowerCase();
        let city=params.dist_name.toLowerCase();
        let market_name=params.area_name.toLowerCase();
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
