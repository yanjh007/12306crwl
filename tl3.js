/**
 *  Stage 3:
 *  Get Trains Number from 12306 API 
 *  Post Train  code
 *  Get train number 
 *  
 */

const 
{ sleep, tlGet, tlConfig, dbExec, dbQuery, DB, stationCode} = require("./tl_lib");

const 
SQL_TRAIN_STATIONS = `
select tcode, sum(tcount) tcount 
from ${DB.TABLE_STATIONS} S join ${DB.TABLE_STRAINS} T on T.scode = S.scode  
group by 1 order by 2 desc`,
SQL_ADD_TRAIN_NUM = `
insert into ${DB.TABLE_TRAINUM} (trainum, tcode, tdate, startcode, endcode) values (?,?,?,?,?)
on conflict do nothing
`; 

const getTrainNumbers = async(trainCode, trainDate)=>{
    // load trains for station
    let urlSearch = tlConfig.URL_SEARCH.replace("$1",trainCode).replace("$2", trainDate);
    let rdata = await tlGet(urlSearch);

    try {
        rdata = JSON.parse(rdata);        
        if (rdata?.data) return rdata.data;
    } catch (error) {
        console.log(error);
        console.log(rdata);
    }
    return null;
};

const loadTrainNumbers = async()=>{
    // code name dictinary
    let ndictionary = await stationCode();
    // console.log(ndictionary);  return;

    // load stations
    let rdata,tlist = await dbQuery(SQL_TRAIN_STATIONS);
    // console.log(tlist); return;

    // query station's trains by request 12306
    let tdate = new Date(Date.now() + 86400*1000 + new Date().getTimezoneOffset()*1000*1000).toISOString().slice(0,10).replaceAll("-","");

    for(const train of tlist) {
        await sleep(2000 + Math.random() * 2000);

        rdata = await getTrainNumbers(train.tcode, tdate);
        if (!rdata || rdata?.length == 0) continue;
        
        // first row 
        rdata = rdata[0];
        
        // update trainnum 
        await dbExec(SQL_ADD_TRAIN_NUM,[rdata.train_no, rdata.station_train_code, rdata.date, ndictionary[rdata.from_station], ndictionary[rdata.to_station]]);
        
        console.log(train.tcode, rdata.from_station,rdata.to_station); 
        // break; // just 4 test;
    };
};

module.exports = { getTrainNumbers, loadTrainNumbers };