// Shared public Firebase onDeviceParams.createOptions and availability options.
// Fresh objects prevent SDK/browser mutation from leaking into later checks.
export const deviceModelOptions=()=>({
 expectedInputs:[{type:'text',languages:['en']}],
 expectedOutputs:[{type:'text',languages:['en']}],
});
