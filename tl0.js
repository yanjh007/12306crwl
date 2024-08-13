/**
 *  Stage 0:
 *  Application entrance and steps
 * 
 */

const 
{ dbInit} = require("./tl_lib");

const start = async ()=>{
    // await dbInit();
    // return;

    // 1 load stations and regions
    const { getStations } = require("./tl1");
    // await getStations(); return;
    
    // 2 station 
    const { loadStationTrains } = require("./tl2");
    // await loadStationTrains(); return;
    // let trains = getTrains("YIJ"); //GZQ
    
    // 3 stations trains number 
    const { loadTrainNumbers } = require("./tl3");
    // await loadTrainNumbers();
    
    // 4 trains schdule 
    const { loadTrains } = require("./tl4");
    await loadTrains();

    // test
    // await loadTrains([{
    //     trainum     : "020000K55404",
    //     startcode   : "JMB",
    //     endcode     : "RZH",
    //     tdate       : "20240720"
    // }]);

}; start();