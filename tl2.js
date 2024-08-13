/**
 *  Stage 2:
 *  Get Trains from 12306 API 
 *  Post Station code
 *  Get train code list of the station 
 *  
 */

const 
{ tlPost, tlConfig, dbExec, dbQuery, DB, sleep} = require("./tl_lib");

const 
SQL_STATIONS = `select scode,name from ${DB.TABLE_STATIONS} order by tcount desc`,
SQL_STATION_TRAINS = `insert into ${DB.TABLE_STRAINS} (scode,tcode) values __VALUES__ on conflict(scode,tcode) do nothing`,
SQL_STRAIN_COUNT   = `update ${DB.TABLE_STATIONS} set tcount = ? where scode = ? `;

const getTrains = async(stationCode)=>{
    // load trains for station  "GZQ"
    let rdata = await tlPost(tlConfig.URL_QUERYCC,{  train_station_code: stationCode  });

    try {
        rdata = JSON.parse(rdata);        
        if (rdata?.status) return rdata.data;
    } catch (error) {
        console.log(error);
    }
    return null;
};

const loadStationTrains = async()=>{
    // load stations
    let svalue,rdata,slist = await dbQuery(SQL_STATIONS);

    // query station's trains by request 12306
    for(const station of slist) {
        // sleep for a while
        await sleep(2000 + Math.random() * 2000);

        rdata = await getTrains(station.scode);
        if (!rdata || rdata?.length == 0) continue;
        
        // update count 
        await dbExec(SQL_STRAIN_COUNT,[rdata.length,station.scode]);
        
        // insert station trains
        svalue  =  rdata.map(v=>`("${station.scode}","${v}")`).join(",");
        // console.log(svalue);
        await dbExec(SQL_STATION_TRAINS.replace("__VALUES__",svalue));
        
        console.log(station.scode, rdata?.length); //break;
        // break; // 4 test;
    };
};



module.exports = { getTrains, loadStationTrains };