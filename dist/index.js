"use strict";var S=Object.create;var c=Object.defineProperty;var L=Object.getOwnPropertyDescriptor;var R=Object.getOwnPropertyNames,x=Object.getOwnPropertySymbols,T=Object.getPrototypeOf,C=Object.prototype.hasOwnProperty,_=Object.prototype.propertyIsEnumerable;var h=(n,o,t)=>o in n?c(n,o,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[o]=t,b=(n,o)=>{for(var t in o||(o={}))C.call(o,t)&&h(n,t,o[t]);if(x)for(var t of x(o))_.call(o,t)&&h(n,t,o[t]);return n};var H=(n,o)=>{for(var t in o)c(n,t,{get:o[t],enumerable:!0})},O=(n,o,t,s)=>{if(o&&typeof o=="object"||typeof o=="function")for(let i of R(o))!C.call(n,i)&&i!==t&&c(n,i,{get:()=>o[i],enumerable:!(s=L(o,i))||s.enumerable});return n};var j=(n,o,t)=>(t=n!=null?S(T(n)):{},O(o||!n||!n.__esModule?c(t,"default",{value:n,enumerable:!0}):t,n)),N=n=>O(c({},"__esModule",{value:!0}),n);var G={};H(G,{default:()=>F});module.exports=N(G);var p=j(require("vite")),w=j(require("javascript-obfuscator"));var g=class{constructor(o){this.show=o;this._log=o?console.log.bind(console):this.noop}noop(o){}alwaysLog(...o){console.log(...o)}info(o){this._log(o)}};function E(n){let o=Math.floor(n/36e5),t=Math.floor(n%36e5/6e4),s=Math.floor(n%6e4/1e3);return[o?`${o}h `:"",t?`${t}m `:"",s||!o&&!t?`${s}s`:""].filter(Boolean).join("")}function P(n){return Object.prototype.toString.call(n)==="[object RegExp]"}function $(n){return Object.prototype.toString.call(n)==="[object String]"}function y(n){return Object.prototype.toString.call(n)==="[object Object]"}function M(n){return Array.isArray(n)}function v(n){return Object.prototype.toString.call(n)==="[object Function]"}function A(n,o){for(let t of o)if(P(t)){if(t.test(n))return!0}else if($(t)&&n.includes(t))return!0;return!1}var k={excludes:[],enable:!0,log:!0,autoExcludeNodeModules:!1,options:{compact:!0,controlFlowFlattening:!0,controlFlowFlatteningThreshold:1,deadCodeInjection:!1,debugProtection:!1,debugProtectionInterval:0,disableConsoleOutput:!1,identifierNamesGenerator:"hexadecimal",log:!1,numbersToExpressions:!1,renameGlobals:!1,selfDefending:!0,simplify:!0,splitStrings:!1,stringArray:!1,stringArrayCallsTransform:!1,stringArrayCallsTransformThreshold:.5,stringArrayEncoding:[],stringArrayIndexShift:!0,stringArrayRotate:!0,stringArrayShuffle:!0,stringArrayWrappersCount:1,stringArrayWrappersChainedCalls:!0,stringArrayWrappersParametersMaxCount:2,stringArrayWrappersType:"variable",stringArrayThreshold:.75,unicodeEscapeSequence:!1}},f="vendor-modules",m={info:"\x1B[36m",warn:"\x1B[33m"};function D(){return p!=null&&p.version?Number(p.version.split(".")[0]):2}function F(n){let o=b(b({},k),n),t=new g(o.log),s=e=>{if(!o.enable||!o.autoExcludeNodeModules)return;e.build=e.build||{},e.build.rollupOptions=e.build.rollupOptions||{};let{output:r}=e.build.rollupOptions,d=l=>{if(o.excludes.push(f),l.includes("node_modules"))return f};if(!r){e.build.rollupOptions.output={manualChunks:d};return}if(M(r)){t.alwaysLog(m.warn,"rollupOptions.output is an array, ignoring autoExcludeNodeModules configuration.");return}if(y(r)){if(!r.manualChunks)r.manualChunks=d;else if(y(r.manualChunks))t.alwaysLog(m.warn,"rollupOptions.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.");else if(v(r.manualChunks)){let l=r.manualChunks;o.excludes.push(f),r.manualChunks=(a,u)=>a.includes("node_modules")?f:l(a,u)}}},i=(e,{bundle:r})=>{if(!o.enable||!r)return e;let d=performance.now();t.alwaysLog("starting obfuscation process..."),Object.entries(r).forEach(([a,u])=>{"code"in u&&u.code&&!A(a,o.excludes)&&(t.info(`obfuscating ${a}...`),u.code=w.default.obfuscate(u.code,o.options).getObfuscatedCode(),t.info(`obfuscation complete for ${a}.`))});let l=E(performance.now()-d);return t.alwaysLog(m.info+"%s\x1B[0m %s","\u2713",`obfuscation process completed in ${l}.`),e};return{name:"vite-plugin-bundle-obfuscator",config:s,transformIndexHtml:D()>=5?{order:"post",handler:i}:{enforce:"post",transform:i}}}
