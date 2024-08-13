/**
 *  Stage 1:
 *  Get Stations from 12306 Home Page
 *  Parse Script List 
 *  Get the station list js file url "Check station_name "
 *  Get station string from the JS file 
 *  insert into table tl_stations and tl_regions 
 * 
 */

const 
htmlparser2= require("htmlparser2"),
{ tlGet, tlConfig, dbExec, dbQuery, DB} = require("./tl_lib"),
TXT_STATIONS = "station_name";

let URL_STATIONS = null;
const parser = new htmlparser2.Parser({
    onopentag(name, attributes) {
        /*
         * This fires when a new tag is opened.
         *
         * If you don't need an aggregated `attributes` object,
         * have a look at the `onopentagname` and `onattribute` events.
         */
        if (name === "script" &&  attributes?.src?.indexOf(TXT_STATIONS) > -1) {
            URL_STATIONS = tlConfig.URL_HOME + attributes.src;
            console.log("Get Station List:JS!", URL_STATIONS );
        }
    },
    ontext(text) {
        /*
         * Fires whenever a section of text was processed.
         *
         * Note that this can fire at any point within text and you might
         * have to stitch together multiple pieces.
         */
        // console.log("-->", text);
    },
    onclosetag(tagname) {
        /*
         * Fires when a tag is closed.
         *
         * You can rely on this event only firing when you have received an
         * equivalent opening tag before. Closing tags without corresponding
         * opening tags will be ignored.
         */
        if (tagname === "script") {
            // console.log("That's it?!");
        }
    },
});

const 
// 车站编码 名称 拼音 区域编码
SQL_ADD_STATION = `insert into ${DB.TABLE_STATIONS}  (scode,name,pyname,rcode) values __VALUES__ ON CONFLICT(scode) DO NOTHING`,
SQL_ADD_REGION  = `insert into ${DB.TABLE_REGIONS}  (rcode,name) values __VALUES__ ON CONFLICT(rcode) DO NOTHING`;

const getStations = async ()=>{
    // return ;
    let hcontent = await tlGet(tlConfig.URL_HOME);

    // console.log(hcontent);
    // get script js file name
    (async()=>{
        parser.write(hcontent);
        parser.end();    
    })();

    // stations list from js file
    hcontent =  await tlGet(URL_STATIONS);

    let vlist, svalue, scode, pyname, rcode, istring,
    rlist = new Set(),
    slist = hcontent.split("@").slice(1);
    // console.log(slist);
    svalue = slist.map(v=>{
        vlist = v.split("|");
        rlist.add(`("${vlist[6]}","${vlist[7]}")`);
        return `("${vlist[2]}","${vlist[1]}","${vlist[3]}","${vlist[6]}")`;
    }).join(',');
    
    // console.log(sql);

    // tb stations
    dbExec(SQL_ADD_STATION.replace("__VALUES__", svalue) );
    
    // tb regions 
    svalue = Array.from(rlist).join(",");
    dbExec(SQL_ADD_REGION.replace("__VALUES__", svalue ));
};

module.exports = { getStations };