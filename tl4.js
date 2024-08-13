/**
 *  Stage 4:
 *  Get Trains Schdule from 12306 API 
 *  Post Train Number and Date
 *  Get train schedule 
 *  
 */

const 
{ tlConfig, dbExec, dbQuery, DB, tlGet, stationCode, sleep} = require("./tl_lib");

const 
SQL_TRAINS = `select trainum, tdate, startcode, endcode from ${DB.TABLE_TRAINUM} `,
SQL_DEL_SCHDULE = `delete from ${DB.TABLE_SCHDULE} where trainum = ? `,
SQL_ADD_SCHDULE = `insert into ${DB.TABLE_SCHDULE} (trainum, iorder, scode, atime ) values (?,?,?,?) `;

// url = "https://kyfw.12306.cn/otn/czxx/queryByTrainNo?train_no=85000K261811&from_station_telecode=LZJ&to_station_telecode=CMW&depart_date=2024-07-09";
const getSchdule = async (train)=>{
    // format convert to adapt intergace 
    if (train?.tdate?.indexOf("-") == -1) {
        train.tdate =  [train.tdate.slice(0,4),train.tdate.slice(4,6),train.tdate.slice(6,8)].join("-");
    };

    // construct url
    let url = tlConfig.URL_SCHDULE
        .replace("$1", train.trainum)
        .replace("$2", train.startcode)
        .replace("$3", train.endcode)
        .replace("$4", train.tdate);

    // console.log("URL",url);
    try {
        let rdata = await tlGet(url);
        // console.log(rdata);
        rdata = JSON.parse(rdata);

        if (rdata?.status == true) return rdata.data.data;
        // let tlist = rdata.data.data;
    } catch (err) {
        console.log(err);
    }

    return null;
};

const loadTrains = async(tlist)=>{
    // station dic
    let rdata,ndictionay = await stationCode();

    // load stations
    if (!tlist) tlist = await dbQuery(SQL_TRAINS);

    // query station's trains by request 12306
    for(const train of tlist) {
        // sleep 
        await sleep(2000 + Math.random() * 2000);

        rdata = await getSchdule(train); 
        
        if (!rdata || rdata?.length == 0) continue;
        // should update traninfo start, end, time,

        // clear data 
        await dbExec(SQL_DEL_SCHDULE,[train.trainum]);

        // insert or update schdule
        let scode, station, istart, itime1,itime2, ilength = rdata.length, iday = 0, noFlip = false;

        for (let i = 1; i<= ilength; i++) {
            station = rdata[i-1];            
            if (i == ilength) i = 99; // last station

            [ itime1, itime2] = station.start_time.split(":");

            // int time
            itime1 =  parseInt(itime1)*60 + parseInt(itime2);

            // first station
            if (i == 1) istart = itime1;

            // flip check
            if (itime1 < istart){
                if (!noFlip) { noFlip = true; iday++ };
            } else {
                noFlip = false;
            };

            // days 
            itime1 += iday*1440;

            // station code 
            scode = ndictionay[station.station_name];

            // console.log(train.trainum, i, scode, itime1,station.station_name);
            await dbExec(SQL_ADD_SCHDULE,[train.trainum, i, scode, itime1]);
        };

        console.log("Schdule:", train.trainum);
        //  break; // 4 test;
    };
};

module.exports = { getSchdule, loadTrains };