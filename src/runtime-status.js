// Session evidence only: never infer verification from config, App Check or storage.
export function recordInference(observed,source){
 if(source==='in_cloud')observed.cloud=true;
 if(source==='on_device')observed.device=true;
 if(source==='in_cloud'||source==='on_device')observed.last=source;
}
export function runtimeStatus(configured,observed){
 if(!configured&&!observed.cloud&&!observed.device)return 'AI not connected · setup required';
 const status=`Cloud ${observed.cloud?'verified':'unverified'} · Device ${observed.device?'verified':'unverified'}`;
 return observed.last?`${status} · last: ${observed.last} (this session)`:`Firebase configuration found · ${status}`;
}
