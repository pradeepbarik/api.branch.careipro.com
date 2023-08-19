import {assets_url} from '../config';
export const userProfilePic=(pic:string|null=null):string=>{
  if(!pic || typeof pic!=='string'){
    pic='default.png';
  }
  return assets_url+'images/profile/patient/'+pic;
}
export const clinicLogo=(pic:string|null=null):string=>{
  if(!pic || typeof pic!=='string'){
    pic='default_clinic.jpg';
  }
  return assets_url+'images/clinic/'+pic;
}
export const clinicBannerImage=(pic:string):string=>{
  return assets_url+'images/clinic/'+pic;
}
export const popularClinicBanner=(pic:string):string=>{
  return assets_url+'images/popular-clinic-banner/'+pic;
}
export const doctorLogo=(pic:string|null=null):string=>{
  if(!pic || typeof pic!=='string'){
    pic='default.jpg';
  }
  return assets_url+'images/profile/doctor/'+pic;
}
export const siteBanner=(image:string):string=>{
    return assets_url+'images/banners/'+image;
}
export const userPrescriptionPhoto=(image:string):string=>{
  return assets_url+'images/patient_document/'+image;
}
export const diseaseIcon=(icon:string):string=>{
  if(icon){
    return assets_url+'images/disease/'+icon;
  }else{
    return "";
  }
}
export const marketingBanner=(image:string):string=>{
  return assets_url+'images/marketing_banner/'+image;
}
