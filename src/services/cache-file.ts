import { cache_directory } from "../config"
export const getCityCacheDir = (state: string, city: string, extraParams?: { market_name?: string, dir?: string }) => {
    if (extraParams && extraParams.market_name && extraParams.dir) {
        return `${cache_directory}/${state.toLowerCase().replace(" ", "-")}/${city.toLowerCase().replace(" ", "-")}/${extraParams.market_name.toLowerCase().replace(" ", "-")}/${extraParams.dir}/`;
    }else if(extraParams?.market_name){
        return `${cache_directory}/${state.toLowerCase().replace(" ", "-")}/${city.toLowerCase().replace(" ", "-")}/${extraParams.market_name.toLowerCase().replace(" ", "-")}/`;
    } else if (extraParams?.dir) {
        return `${cache_directory}/${state.toLowerCase().replace(" ", "-")}/${city.toLowerCase().replace(" ", "-")}/${extraParams.dir}/`;
    }
    return `${cache_directory}/${state.toLowerCase().replace(" ", "-")}/${city.toLowerCase().replace(" ", "-")}/`;
}
export const getCacheDir = (params: { dir?: string } = {}) => {
    if (params.dir) {
        return `${cache_directory}/${params.dir}/`;
    }else{
        return `${cache_directory}/`;
    }
}