var y=Object.defineProperty;var u=Object.getOwnPropertySymbols;var h=Object.prototype.hasOwnProperty,C=Object.prototype.propertyIsEnumerable;var g=(e,o,r)=>o in e?y(e,o,{enumerable:!0,configurable:!0,writable:!0,value:r}):e[o]=r,l=(e,o)=>{for(var r in o||(o={}))h.call(o,r)&&g(e,r,o[r]);if(u)for(var r of u(o))C.call(o,r)&&g(e,r,o[r]);return e};import*as n from"vite";import T from"javascript-obfuscator";var i=class{constructor(o){this.show=o;this._log=o?console.log.bind(console):this.noop}noop(o){}alwaysLog(...o){console.log(...o)}info(o){this._log(o)}};function p(e){let o=Math.floor(e/36e5),r=Math.floor(e%36e5/6e4),t=Math.floor(e%6e4/1e3);return[o?`${o}h `:"",r?`${r}m `:"",t||!o&&!r?`${t}s`:""].filter(Boolean).join("")}var d={excludes:[],enable:!0,log:!0,options:{compact:!0,controlFlowFlattening:!0,controlFlowFlatteningThreshold:1,deadCodeInjection:!1,debugProtection:!1,debugProtectionInterval:0,disableConsoleOutput:!1,identifierNamesGenerator:"hexadecimal",log:!1,numbersToExpressions:!1,renameGlobals:!1,selfDefending:!0,simplify:!0,splitStrings:!1,stringArray:!1,stringArrayCallsTransform:!1,stringArrayCallsTransformThreshold:.5,stringArrayEncoding:[],stringArrayIndexShift:!0,stringArrayRotate:!0,stringArrayShuffle:!0,stringArrayWrappersCount:1,stringArrayWrappersChainedCalls:!0,stringArrayWrappersParametersMaxCount:2,stringArrayWrappersType:"variable",stringArrayThreshold:.75,unicodeEscapeSequence:!1}};function v(e){return Object.prototype.toString.call(e)==="[object RegExp]"}function A(e){return Object.prototype.toString.call(e)==="[object String]"}function m(e,o){for(let r of o)if(v(r)){if(r.test(e))return!0}else if(A(r)&&e.includes(r))return!0;return!1}function E(){return n!=null&&n.version?Number(n.version.split(".")[0]):2}function j(e){let o=l(l({},d),e),r=new i(o.log),t=(f,{bundle:c})=>{if(!o.enable||!c)return f;let b=performance.now();r.alwaysLog("starting obfuscation process..."),Object.entries(c).forEach(([a,s])=>{"code"in s&&s.code&&!m(a,o.excludes)&&(r.info(`obfuscating ${a}...`),s.code=T.obfuscate(s.code,o.options).getObfuscatedCode(),r.info(`obfuscation complete for ${a}.`))});let x=p(performance.now()-b);return r.alwaysLog("\x1B[36m%s\x1B[0m %s","\u2713",`obfuscation process completed in ${x}.`),f};return{name:"vite-plugin-bundle-obfuscator",transformIndexHtml:E()>=5?{order:"post",handler:t}:{enforce:"post",transform:t}}}export{j as default};
