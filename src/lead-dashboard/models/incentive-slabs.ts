import { successResponse } from "../../services/response";
import getIncentiveSlabsModel from "../schemas/incentive-slabs";

const incentiveSlabsModel = {
    getSlabs: async (params: { branch_id: number }) => {
        const SlabsModel = getIncentiveSlabsModel();
        const slabs = await SlabsModel.find({ branch_id: params.branch_id })
            .sort({ min_percent: 1 })
            .lean();
        return successResponse(slabs, "Incentive slabs fetched successfully");
    },

    setSlabs: async (params: {
        branch_id: number;
        slabs: Array<{ min_percent: number; max_percent: number | null; amount: number; label: string }>;
    }) => {
        const SlabsModel = getIncentiveSlabsModel();
        const now = new Date();

        await SlabsModel.deleteMany({ branch_id: params.branch_id });

        if (params.slabs.length > 0) {
            await SlabsModel.insertMany(
                params.slabs.map(s => ({ ...s, branch_id: params.branch_id, created_at: now, updated_at: now }))
            );
        }
        return successResponse({}, "Incentive slabs updated successfully");
    },
};

export default incentiveSlabsModel;
