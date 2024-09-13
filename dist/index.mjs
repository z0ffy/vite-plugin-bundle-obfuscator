var M=Object.defineProperty;var y=Object.getOwnPropertySymbols;var v=Object.prototype.hasOwnProperty,A=Object.prototype.propertyIsEnumerable;var x=(n,o,t)=>o in n?M(n,o,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[o]=t,g=(n,o)=>{for(var t in o||(o={}))v.call(o,t)&&x(n,t,o[t]);if(y)for(var t of y(o))A.call(o,t)&&x(n,t,o[t]);return n};import*as u from"vite";import F from"javascript-obfuscator";var f=class{constructor(o){this.show=o;this._log=o?console.log.bind(console):this.noop}noop(o){}alwaysLog(...o){console.log(...o)}info(o){this._log(o)}};function h(n){let o=Math.floor(n/36e5),t=Math.floor(n%36e5/6e4),p=Math.floor(n%6e4/1e3);return[o?`${o}h `:"",t?`${t}m `:"",p||!o&&!t?`${p}s`:""].filter(Boolean).join("")}function k(n){return Object.prototype.toString.call(n)==="[object RegExp]"}function w(n){return Object.prototype.toString.call(n)==="[object String]"}function m(n){return Object.prototype.toString.call(n)==="[object Object]"}function C(n){return Array.isArray(n)}function O(n){return Object.prototype.toString.call(n)==="[object Function]"}function j(n,o){for(let t of o)if(k(t)){if(t.test(n))return!0}else if(w(t)&&n.includes(t))return!0;return!1}var E={excludes:[],enable:!0,log:!0,apply:"build",autoExcludeNodeModules:!1,options:{compact:!0,controlFlowFlattening:!0,controlFlowFlatteningThreshold:1,deadCodeInjection:!1,debugProtection:!1,debugProtectionInterval:0,disableConsoleOutput:!1,identifierNamesGenerator:"hexadecimal",log:!1,numbersToExpressions:!1,renameGlobals:!1,selfDefending:!0,simplify:!0,splitStrings:!1,stringArray:!1,stringArrayCallsTransform:!1,stringArrayCallsTransformThreshold:.5,stringArrayEncoding:[],stringArrayIndexShift:!0,stringArrayRotate:!0,stringArrayShuffle:!0,stringArrayWrappersCount:1,stringArrayWrappersChainedCalls:!0,stringArrayWrappersParametersMaxCount:2,stringArrayWrappersType:"variable",stringArrayThreshold:.75,unicodeEscapeSequence:!1}},l="vendor-modules",d=Object.freeze({info:"\x1B[36m",warn:"\x1B[33m"});function S(){return u!=null&&u.version?Number(u.version.split(".")[0]):2}function L(n){let o=g(g({},E),n),t=new f(o.log),p=e=>{if(!o.enable||!o.autoExcludeNodeModules)return;e.build=e.build||{},e.build.rollupOptions=e.build.rollupOptions||{};let{output:r}=e.build.rollupOptions,c=a=>{if(o.excludes.push(l),a.includes("node_modules"))return l};if(!r){e.build.rollupOptions.output={manualChunks:c};return}if(C(r)){t.alwaysLog(d.warn,"rollupOptions.output is an array, ignoring autoExcludeNodeModules configuration.");return}if(m(r)){if(!r.manualChunks)r.manualChunks=c;else if(m(r.manualChunks))t.alwaysLog(d.warn,"rollupOptions.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.");else if(O(r.manualChunks)){let a=r.manualChunks;o.excludes.push(l),r.manualChunks=(i,s)=>i.includes("node_modules")?l:a(i,s)}}},b=(e,{bundle:r})=>{if(!o.enable||!r)return e;let c=performance.now();t.alwaysLog("starting obfuscation process..."),Object.entries(r).forEach(([i,s])=>{"code"in s&&s.code&&!j(i,o.excludes)&&(t.info(`obfuscating ${i}...`),s.code=F.obfuscate(s.code,o.options).getObfuscatedCode(),t.info(`obfuscation complete for ${i}.`))});let a=h(performance.now()-c);return t.alwaysLog(d.info+"%s\x1B[0m %s","\u2713",`obfuscation process completed in ${a}.`),e};return{name:"vite-plugin-bundle-obfuscator",apply:o.apply,config:p,transformIndexHtml:S()>=5?{order:"post",handler:b}:{enforce:"post",transform:b}}}export{L as default};
