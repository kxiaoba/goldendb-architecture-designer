/* Strict address parsing for declared interface inventories. No DNS/URL coercion. */
(function(root){'use strict';
function v4(s){if(typeof s!=='string'||! /^(0|[1-9]\d{0,2})(\.(0|[1-9]\d{0,2})){3}$/.test(s))return null;const a=s.split('.').map(Number);return a.some(x=>x>255)?null:a.reduce((n,x)=>n*256+x,0);}
function parse(s){
 if(typeof s!=='string'||s.length>80||/[\s%\[\]/]/.test(s))return null;
 if(!s.includes(':')){const n=v4(s);return n===null?null:{family:4,value:BigInt(n)};}
 let input=s;
 if(s.includes('.')){const pos=s.lastIndexOf(':'),n=v4(s.slice(pos+1));if(n===null)return null;input=s.slice(0,pos+1)+Math.floor(n/65536).toString(16)+':'+(n%65536).toString(16);}
 if(!/^[0-9a-f:]+$/i.test(input))return null;
 const parts=input.split('::');if(parts.length>2)return null;
 const left=parts[0]?parts[0].split(':'):[],right=parts.length===2&&parts[1]?parts[1].split(':'):[];
 if([...left,...right].some(x=>! /^[0-9a-f]{1,4}$/i.test(x)))return null;
 let words;
 if(parts.length===1){if(left.length!==8)return null;words=left;}
 else{const zeros=8-left.length-right.length;if(zeros<1)return null;words=[...left,...Array(zeros).fill('0'),...right];}
 return {family:6,value:words.reduce((v,w)=>(v<<16n)+BigInt(parseInt(w,16)),0n)};
}
function prefix(s){if(typeof s!=='string')return null;const p=s.split('/');if(p.length!==2||! /^(0|[1-9]\d{0,2})$/.test(p[1]))return null;const a=parse(p[0]),bits=Number(p[1]);if(!a||bits>(a.family===4?32:128))return null;const shift=BigInt((a.family===4?32:128)-bits),start=(a.value>>shift)<<shift,end=start+(1n<<shift)-1n;return {...a,bits,start,end,canonical:a.value===start};}
function classification(a){if(a.family===4){const n=Number(a.value);return n<16777216||Math.floor(n/16777216)===127||n>=3758096384?'non-unicast':'ordinary';}
 const n=a.value;if(n===0n||n===1n||(n>>120n)===255n)return 'non-unicast';if((n>>118n)===1018n)return 'link-local';if((n>>32n)===65535n)return 'mapped';if(n<(1n<<32n))return 'legacy-compatible';return 'ordinary';}
const api={parse,prefix,classification};root.GoldenDBNetworkAddress=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
