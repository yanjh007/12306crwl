const
https = require("https"), 
fs = require('node:fs'),
sqlite3 = require('sqlite3').verbose(),
SQDB = new sqlite3.Database( __dirname+'/tldb.sqlite3'),
URL_HOME = "https://www.12306.cn/index/", // first page for 12306
URL_ENPOINT  = "https://kyfw.12306.cn/otn",
URL_STATIONS = URL_ENPOINT + "/resources/js/framework/station_name.js",
URL_TRAINS   = URL_ENPOINT + "/leftTicket/query/js/query/train_list.js",
// 列车编号 trainum , 出发车站电报码start 到达车站电报码end  出发日期tdate
URL_SCHDULE  = URL_ENPOINT + "/czxx/queryByTrainNo?train_no=$1&from_station_telecode=$2&to_station_telecode=$3&depart_date=$4",
URL_QUERYCC  = "https://www.12306.cn/index/otn/zwdch/queryCC",
URL_SEARCH   = "https://search.12306.cn/search/v1/train/search?keyword=$1&date=$2";

// https://kyfw.12306.cn/otn/?leftTicketDTO.train_date=2024-07-09&leftTicketDTO.from_station=LZJ&leftTicketDTO.to_station=CDW&purpose_codes=ADULT

// config information for export
const tlConfig = {
    URL_HOME, 
    URL_QUERYCC, 
    URL_SEARCH, 
    URL_SCHDULE
}

const STD_HEADER = {
    "Accept": "text/html, application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ",
};

const handelRes = (resp, cb)=>{
    let data = [];
    // A chunk of data has been received.
    resp
    .on('data', chunk => data.push(chunk))
    .on('end', () => cb(Buffer.concat(data).toString()));
}

const tlPost = async (url, pdata)=> new Promise((r,j)=>{
    url  = url.replace("https://",""); // all https
    let host = url.split("/")[0];
    let path = url.slice(host.length);

    // get port and host 
    port = host.split(":")[1] || 443;
    host = host.split(":")[0];

    // form encode
    const fmBody = Object.keys(pdata)
        .map(k=> encodeURI(k) +"="+ encodeURI(pdata[k]))
        .join("&");
    
    let req = https.request({  
        host, port, path,
        method: "POST",
        headers: {  ...STD_HEADER,
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Content-Length": Buffer.byteLength(fmBody),
        }
    }, (resp)=> { handelRes(resp, r) })
    .on("error", (err) => {
        console.log("Error: " + err.message);
        r(null);
    });

    req.write(Buffer.from(fmBody));
    req.end();
});

const tlGet = async (url)=> new Promise((r,j)=>{
    https.get(url,{
        headers: { ...STD_HEADER }
    }, (resp)=> handelRes(resp, r)
    ).on("error", (err) => {
        console.log("Error: " + err);
        r(null);
    });
});

const DB = {
    TABLE_REGIONS   : "tl_regions",
    TABLE_STATIONS  : "tl_stations",
    TABLE_TRAINS    : "tl_trains",
    TABLE_TRAINUM   : "tl_trainums", // trains number add start end number date
    TABLE_STRAINS   : "tl_strains", // station trans 
    TABLE_SCHDULE   : "tl_schdule" // train schdule 
};

const 
// 车站编码 名称 拼音 区域编码
SQL_CREATE = "create table if not exists",
SQL_DROP   = `
Drop table if exists ${DB.TABLE_STATIONS}; 
Drop table if exists ${DB.TABLE_REGIONS}; 
Drop table if exists ${DB.TABLE_TRAINS}; 
Drop table if exists ${DB.TABLE_STRAINS}; 
`,
SQL_TABLE_STATION = `${SQL_CREATE} ${DB.TABLE_STATIONS}  
(scode text primary key, name text, pyname text, rcode text, tcount integer default 0) `,
SQL_TABLE_REGION  = `${SQL_CREATE} ${DB.TABLE_REGIONS}  
(rcode text primary key, name text) `,
SQL_TABLE_TRAINS  = `${SQL_CREATE} ${DB.TABLE_TRAINS}  
(tcode text primary key, name text, pyname text, rcode text) `,
SQL_TABLE_TRAINUM = `${SQL_CREATE} ${DB.TABLE_TRAINUM} 
(trainum text primary key, tcode text, tdate text, startcode text, endcode text , iflag interger default 0)`,
SQL_TABLE_STRAINS = `${SQL_CREATE} ${DB.TABLE_STRAINS} 
(scode text , tcode text, iorder integer default 0, iflag interger default 0, UNIQUE(scode,tcode))`,
SQL_TABLE_SCHDULE = `${SQL_CREATE} ${DB.TABLE_SCHDULE} 
(trainum text, iorder integer default 0, scode text, atime interger default 0, UNIQUE(trainum,scode) )`;

// console.log(SQL_TABLE_STRAINS);
// db init
const dbInit = async ()=>{
    // await dbExec(SQL_CLEAN);
    await dbExec(SQL_TABLE_STATION);
    await dbExec(SQL_TABLE_REGION);
    await dbExec(SQL_TABLE_STRAINS);
    await dbExec(SQL_TABLE_TRAINUM);
    await dbExec(SQL_TABLE_SCHDULE);
};

const dbQuery = async (sql, param)=> new Promise((r,j)=>{
    if (param) {
        SQDB.all(sql, param, (err,rows)=>{
            if (err) {
                r(null);
            } else {
                r(rows);
            }
        });
    } else {
        SQDB.all(sql,(err,rows)=>{
            if (err) {
                r(null);
            } else {
                r(rows);
            }
        });
    }
});

const dbExec = async (sql, param)=> new Promise((r,j)=> {
    if (param) {
        // prepared statment
        const stmt = SQDB.prepare(sql);
        if (param?.array) { // run arr
            for (let i = 0; param.data.length; i++) {
                stmt.run(param.data[i]);
            }
        } else {
            stmt.run(param);
        }
        stmt.finalize(err => r(err? false : true));
    } else {
        SQDB.run(sql, err => r(err ? false: true));
    };
});

const sleep = (timeout)=>new Promise(r=>setTimeout(()=> r(1), timeout));

const 
SQL_NAME_CODE  = `select name, scode from ${DB.TABLE_STATIONS} `,
SQL_NAME_CODE1 = SQL_NAME_CODE + `where name = ? or scode = ? limit 1 `;
const stationCode = async(name)=>{
    let nlist;
    if (name) { // by name or scode
        nlist = await dbQuery(SQL_NAME_CODE1,[name,name]);
        if (nlist) return nlist[0];
    } else {
        nlist = await dbQuery(SQL_NAME_CODE);
        // console.log(nlist);
        if (nlist) { // return dictionay 
            return nlist.reduce((c,v)=>(c[v.name] = v.scode,c[v.scode] = v.name,c),{});
        };       
    }
    return null;    
}

module.exports = { sleep,tlConfig, tlGet, tlPost, DB, dbInit, dbQuery, dbExec, stationCode };