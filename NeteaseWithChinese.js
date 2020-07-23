/**
 * Netease Music Lyrics with Chinese Translation
 * Original Author: btx258 Elia
 * Modified by: Konata09
 * License: GNU GPLv3
 * Github: https://github.com/Konata09/ESLyric_netease
 */

/**
 * set true will only return lyrics that have translation to the result list.
 * 设置为true将只返回带有翻译的歌词.
 */
var only_chi = false

// Set false if do not want console output infos.
var dbg = true;

var header = {
    'Referer': 'http://music.163.com/',
    'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:76.0) Gecko/20100101 Firefox/76.0'
};
var cookie = "appver=2.0.2";

var api = {
    "lyric": 'http://music.163.com/api/song/lyric',
    "query": "http://music.163.com/api/search/get/"
};

// Eng | CHN, separated by `|', but only one will be displayed in lyric search
// window (`Source' column) acording to foobar2000.exe's lang.
function get_my_name() {
    return "网易云中文|网易云中文";
}

function get_version() {
    return "0.1.1";
}

function get_author() {
    return "btx258 Elia Konata09";
}

function start_search(info, callback) {

    var url;
    var title = info.Title;
    var artist = info.Artist;

    var http_client = utils.CreateHttpClient();
    var json_txt;

    // Set headers, Cookie, postData
    add_headers(header, http_client);
    http_client.addCookie("Cookie", cookie);
    http_client.addPostData(get_search_params(artist, title));

    json_txt = http_client.Request(api.query, "POST");
    if (http_client.StatusCode != 200) {
        ne_trace("Request url >>>" + api.query + "<<< error: " + http_client.StatusCode);
        return;
    }

    var obj_result = json(json_txt)["result"];
    var songs;
    if (obj_result.songs) {
        songs = obj_result.songs;
        ne_trace(songs.length);
    } else {
        ne_trace(json_txt);
        return;
    }

    //ne_trace(json_txt);

    var _new_lyric = callback.CreateLyric();
    var id;

    // get lyrics
    for (var i = 0; i < songs.length; i++) {
        if (callback.IsAborting()) {
            ne_trace("User aborted!");
            break;
        }
        try {
            id = songs[i]["id"];
            artist = songs[i].artists[0].name;
            title = songs[i].name;
            album = songs[i].album.name;
        } catch (e) { };
        url = api.lyric + "?os=pc&id=" + id + "&lv=-1&kv=-1&tv=-1";
        add_headers(header, http_client);
        json_txt = http_client.Request(url);
        if (http_client.StatusCode != 200) {
            ne_trace("Request url >>>" + url + "<<< error: " + http_client.StatusCode);
            continue;
        }
        try {
            var ori_lrc = json(json_txt).lrc.lyric;
            var ori_tlrc = json(json_txt).tlyric.lyric;
            if (!ori_tlrc) {
                if (only_chi)
                    continue;
                else
                    _new_lyric.LyricText = ori_lrc;
            } else {
                _new_lyric.LyricText = generate_translation(pre_trim(ori_lrc), pre_trim(ori_tlrc));
            }
            _new_lyric.Title = title;
            _new_lyric.Artist = artist;
            _new_lyric.Album = album;
            _new_lyric.Location = url;
            _new_lyric.Source = get_my_name();
            callback.AddLyric(_new_lyric);
            (i % 2 == 0) && callback.Refresh();
        } catch (e) {
            ne_trace(e.message);
        }
    }

    _new_lyric.Dispose();

}

function generate_translation(plain, translation) {
    // ne_trace(plain);
    // ne_trace("############################################");
    // ne_trace(translation);

    var arr_plain = plain.split("\n");
    var arr_translation = translation.split("\n");

    // 歌词和翻译顶部信息不一定都有，会导致翻译对不齐，所以删掉
    // 同时修复网易云各种怪异的格式
    for (var i = arr_plain.length - 1; i >= 0; i--) {
        if (arr_plain[i].indexOf("[ti:") >= 0 || arr_plain[i].indexOf("[ar:") >= 0 || arr_plain[i].indexOf("[al:") >= 0 || arr_plain[i].indexOf("[by:") >= 0 || arr_plain[i].indexOf("[offset:") >= 0 || arr_plain[i].indexOf("[kana:") >= 0 || arr_plain[i] == "") {
            arr_plain.splice(i, 1);
        }
    }
    for (var j = arr_translation.length - 1; j >= 0; j--) {
        if (arr_translation[j].indexOf("[ti:") >= 0 || arr_translation[j].indexOf("[ar:") >= 0 || arr_translation[j].indexOf("[al:") >= 0 || arr_translation[j].indexOf("[by:") >= 0 || arr_translation[j].indexOf("[offset:") >= 0 || arr_translation[j].indexOf("[kana:") >= 0 || arr_translation[j] == "") {
            arr_translation.splice(j, 1);
            continue;
        }
        if (!arr_translation[j].match(/\[\d\d:\d\d.\d\d\]/g) && arr_translation[j] != "") {
            arr_translation[j - 1] += arr_translation[j];
            arr_translation.splice(j, 1);
        }
    }

    // 有的歌词和翻译对不齐，处理一下
    if (arr_plain.length != arr_translation.length) {
        for (var i = 0; i < arr_plain.length; i++) {
            // ne_trace(arr_plain);
            if (arr_plain[i] == null || trim(arr_plain[i]) == "") {
                arr_plain.splice(i, 1);
                i = i - 1;
            }
            if (arr_translation[i] != null) {
                if (trim(arr_plain[i].substring(10)) == "" && trim(arr_translation[i].substring(10)) != "") {
                    arr_plain.splice(i, 1);
                    i = i - 1;
                }
            } else {
                if (trim(arr_plain[i].substring(10)) == "") {
                    arr_plain.splice(i, 1);
                    i = i - 1;
                }
            }
        }
        for (var i = 0; i < arr_translation.length; i++) {
            if (arr_translation[i] == null || trim(arr_translation[i]) == "") {
                arr_translation.splice(i, 1);
                i = i - 1;
            }
            if (arr_plain[i] != null) {
                if (trim(arr_translation[i].substring(10)) == "" && trim(arr_plain[i].substring(10)) != "") {
                    arr_translation.splice(i, 1);
                    i = i - 1;
                }
            } else {
                if (trim(arr_translation[i].substring(10)) == "") {
                    arr_translation.splice(i, 1);
                    i = i - 1;
                }
            }
        }
    }
    // ne_trace(arr_plain);
    // ne_trace(arr_translation);

    // 开始拼接歌词和翻译
    var translated_lyrics = "";
    for (var i = 0, j = 0; i < arr_plain.length; i++) {
        translated_lyrics += trim(arr_plain[i]) + "\r\n";
        var timestamp = "";
        if (i < arr_plain.length - 1 && arr_plain[i + 1].indexOf("[") != -1) {
            timestamp = "[" + format_time(to_millisecond(arr_plain[i + 1].substr(1, 8))) + "]";
        }
        else {
            timestamp = "[" + format_time(to_millisecond(arr_plain[i].substr(1, 8)) + 60000) + "]";
        }
        if (!arr_translation[j] || arr_plain[i].substr(1, 8) !== arr_translation[j].substr(1, 8)) {
            translated_lyrics += timestamp + "\r\n";
            continue;
        } else {
            var translation_line = "";
            translation_line = arr_translation[j].substring(10);
            translation_line = trim(translation_line);
            if (translation_line == "" || translation_line == "　　") {
                translated_lyrics += timestamp + translation_line + "\r\n";
            } else {
                translated_lyrics += timestamp + "" + translation_line + "" + "\r\n";
            }
            j++;
        }
    }
    // 将部分字体可能显示为方框的空白字符替换为普通空格
    translated_lyrics = translated_lyrics.replace(/[\u2005]+/g, " ");
    // ne_trace(translated_lyrics);
    return translated_lyrics;
}

function to_millisecond(timeString) {
    return parseInt(timeString.slice(0, 2), 10) * 60000 + parseInt(timeString.substr(3, 2), 10) * 1000 + parseInt(timeString.substr(6, 2), 10) * 10;
}

function zpad(n) {
    var s = n.toString();
    if (s.length < 2) {
        return "0" + s;
    } else if (s.length > 2) {
        return s.substr(0, 2);
    } else {
        return s;
    }
}

function format_time(time) {
    var t = Math.abs((time - 20) / 1000);
    var h = Math.floor(t / 3600);
    t = t - h * 3600;
    var m = Math.floor(t / 60);
    t = t - m * 60;
    var s = Math.floor(t);
    var ms = t - s;
    var str = (h ? zpad(h) + ":" : "") + zpad(m) + ":" + zpad(s) + "." + zpad(Math.floor(ms * 100));
    return str;
}

function trim(str) {
    resultStr = str;
    resultStr = resultStr.replace(/^(\s|\xA0)+|(\s|\xA0)+$/g, '');
    resultStr = resultStr.replace(/&apos;/g, '\'');
    resultStr = resultStr.replace(/&amp;/g, '&');
    return resultStr;
}

function qm_generate_single_line(plain) {
    var arr_plain = plain.split("\n");
    var single_line_lyrics = "";
    for (var i = 0; i < arr_plain.length; i++) {
        single_line_lyrics += trim(arr_plain[i]) + "\r\n";
        var timestamp = "";
        if (i < arr_plain.length - 1) {
            timestamp = format_time(to_millisecond(arr_plain[i + 1].substr(1, 8)));
        }
        else {
            timestamp = format_time(to_millisecond(arr_plain[i].substr(1, 8)) + 1000);
        }
        if (!isNaN(timestamp)) {
            single_line_lyrics += "[" + timestamp + "]" + "　　" + "\r\n";
        }
    }
    return single_line_lyrics;
}


function add_headers(header, client) {
    for (var i in header) {
        client.addHttpHeader(i, header[i]);
    }
}

function get_search_params(artist, title, limit, type, offset) {
    if (limit == undefined) limit = 10;
    if (type == undefined) type = 1;
    if (offset == undefined) offset = 0;
    artist = process_keywords(artist);
    title = process_keywords(title);
    return "s=" + artist + "+" + title + "&limit=" + limit + "&type=" + type + "&offset=" + offset;
}


function process_keywords(str) {
    var s = str;
    s = s.toLowerCase();
    s = s.replace(/\'|·|\$|\&|–/g, "");
    // s = s.replace(/\//g, " ");
    //truncate all symbols
    s = s.replace(/\(.*?\)|\[.*?]|{.*?}|（.*?/g, "");
    s = s.replace(/[-/:-@[-`{-~]+/g, "");
    s = s.replace(/[\u2014\u2018\u201c\u2026\u3001\u3002\u300a\u300b\u300e\u300f\u3010\u3011\u30fb\uff01\uff08\uff09\uff0c\uff1a\uff1b\uff1f\uff5e\uffe5]+/g, "");
    return s;
}

function json(text) {
    var data = JSON.parse(text);
    return data;
}

function ne_trace(s) {
    if (!dbg) {
        return;
    }
    fb.trace("网易云中文 $>  " + s);
    // console.log(s);
}

function pre_trim(lrc) {
    lrc = lrc.replace(/^[^\[]+|(\\n)+$/g, "");
    lrc = lrc.replace(/\[\d\d:\d\d.\d\d\d\]/g, function (match) {
        return match.substr(0, 9) + "]";
    })
    // fb.trace(lrc);
    return lrc;
}