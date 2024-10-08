"use strict";var L=Object.create;var c=Object.defineProperty;var R=Object.getOwnPropertyDescriptor;var T=Object.getOwnPropertyNames,x=Object.getOwnPropertySymbols,_=Object.getPrototypeOf,C=Object.prototype.hasOwnProperty,w=Object.prototype.propertyIsEnumerable;var h=(n,o,r)=>o in n?c(n,o,{enumerable:!0,configurable:!0,writable:!0,value:r}):n[o]=r,b=(n,o)=>{for(var r in o||(o={}))C.call(o,r)&&h(n,r,o[r]);if(x)for(var r of x(o))w.call(o,r)&&h(n,r,o[r]);return n};var H=(n,o)=>{for(var r in o)c(n,r,{get:o[r],enumerable:!0})},O=(n,o,r,s)=>{if(o&&typeof o=="object"||typeof o=="function")for(let i of T(o))!C.call(n,i)&&i!==r&&c(n,i,{get:()=>o[i],enumerable:!(s=R(o,i))||s.enumerable});return n};var j=(n,o,r)=>(r=n!=null?L(_(n)):{},O(o||!n||!n.__esModule?c(r,"default",{value:n,enumerable:!0}):r,n)),N=n=>O(c({},"__esModule",{value:!0}),n);var G={};H(G,{default:()=>S});module.exports=N(G);var p=j(require("vite")),F=j(require("javascript-obfuscator"));var g=class{constructor(o){this.show=o;this._log=o?console.log.bind(console):this.noop}noop(o){}forceLog(...o){console.log(...o)}info(o){this._log(o)}};function E(n){let o=Math.floor(n/36e5),r=Math.floor(n%36e5/6e4),s=Math.floor(n%6e4/1e3);return[o?`${o}h `:"",r?`${r}m `:"",s||!o&&!r?`${s}s`:""].filter(Boolean).join("")}function P(n){return Object.prototype.toString.call(n)==="[object RegExp]"}function $(n){return Object.prototype.toString.call(n)==="[object String]"}function y(n){return Object.prototype.toString.call(n)==="[object Object]"}function M(n){return Array.isArray(n)}function v(n){return Object.prototype.toString.call(n)==="[object Function]"}function A(n,o){for(let r of o)if(P(r)){if(r.test(n))return!0}else if($(r)&&n.includes(r))return!0;return!1}var k={excludes:[],enable:!0,log:!0,apply:"build",autoExcludeNodeModules:!1,options:{compact:!0,controlFlowFlattening:!0,controlFlowFlatteningThreshold:1,deadCodeInjection:!1,debugProtection:!1,debugProtectionInterval:0,disableConsoleOutput:!1,identifierNamesGenerator:"hexadecimal",log:!1,numbersToExpressions:!1,renameGlobals:!1,selfDefending:!0,simplify:!0,splitStrings:!1,stringArray:!1,stringArrayCallsTransform:!1,stringArrayCallsTransformThreshold:.5,stringArrayEncoding:[],stringArrayIndexShift:!0,stringArrayRotate:!0,stringArrayShuffle:!0,stringArrayWrappersCount:1,stringArrayWrappersChainedCalls:!0,stringArrayWrappersParametersMaxCount:2,stringArrayWrappersType:"variable",stringArrayThreshold:.75,unicodeEscapeSequence:!1}},f="vendor-modules",m=Object.freeze({info:"\x1B[36m",warn:"\x1B[33m"});function D(){return p!=null&&p.version?Number(p.version.split(".")[0]):2}function S(n){let o=b(b({},k),n),r=new g(o.log),s=e=>{if(!o.enable||!o.autoExcludeNodeModules)return;e.build=e.build||{},e.build.rollupOptions=e.build.rollupOptions||{};let{output:t}=e.build.rollupOptions,d=l=>{if(o.excludes.push(f),l.includes("node_modules"))return f};if(!t){e.build.rollupOptions.output={manualChunks:d};return}if(M(t)){r.forceLog(m.warn,"rollupOptions.output is an array, ignoring autoExcludeNodeModules configuration.");return}if(y(t)){if(!t.manualChunks)t.manualChunks=d;else if(y(t.manualChunks))r.forceLog(m.warn,"rollupOptions.output.manualChunks is an object, ignoring autoExcludeNodeModules configuration.");else if(v(t.manualChunks)){let l=t.manualChunks;o.excludes.push(f),t.manualChunks=(a,u)=>a.includes("node_modules")?f:l(a,u)}}},i=(e,{bundle:t})=>{if(!o.enable||!t)return e;let d=performance.now();r.forceLog("starting obfuscation process..."),Object.entries(t).forEach(([a,u])=>{"code"in u&&u.code&&!A(a,o.excludes)&&(r.info(`obfuscating ${a}...`),u.code=F.default.obfuscate(u.code,o.options).getObfuscatedCode(),r.info(`obfuscation complete for ${a}.`))});let l=E(performance.now()-d);return r.forceLog(m.info+"%s\x1B[0m %s","\u2713",`obfuscation process completed in ${l}.`),e};return{name:"vite-plugin-bundle-obfuscator",apply:o.apply,config:s,transformIndexHtml:D()>=5?{order:"post",handler:i}:{enforce:"post",transform:i}}}
