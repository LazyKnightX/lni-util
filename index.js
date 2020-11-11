const jet = require('fs-jetpack');

function orderObject(unordered) {
  const ordered = {};
  Object.keys(unordered).sort().forEach(function(key) {
    ordered[key] = unordered[key];
  });
  return ordered;
}

class LniUtil {
  static lni2Obj(lniText, config) {
    if (lniText == null) {
      lniText = "";
    }
    if (config == null) {
      config = {};
    }

    lniText = lniText.replace(/\r/gm, '\n')
    lniText = lniText.replace(/\n\n/gm, '\n')

    lniText = lniText + '\n';

    // filter: [=[ ... ]=]
    lniText = lniText.replace(/\[\=\[\n([\S\s]*?)\]\=\]/gms, function(match, capture) {
      // console.log('capture: ', JSON.stringify(capture));
      let text = capture.replace(/\n/gm, '|n');
      text = `"${text}"`;
      // console.log('return: ', JSON.stringify(text));
      return text;
    });

    if (config.ignoreUbertip === true) {
      lniText = lniText.replace(/Ubertip = \{(.*?)\}\n/gms, '');
      lniText = lniText.replace(/Ubertip.*$\n/gm, '');
    }
    lniText = lniText.replace(/^--.*$\n/gm, ''); // s1
    lniText = lniText.replace(/^\[\"(.*)\"\]$/gm, '[$1]'); // s1 (["u!00"] as [u!00])
    lniText = lniText.replace(/^([_a-zA-Z0-9]+) ?= ?(.+)$/gm, '"$1": $2'); // s2
    lniText = lniText.replace(/^\"([_a-zA-Z0-9]+)\"\: \{([^\}]+)\}$/gm, '"$1": [$2]'); // s3
    lniText = lniText.replace(/\[([\n]+("\d+": .+[\n]+)*)\]/gm, '{$1}'); // s4
    lniText = lniText.replace(/^(\d+)\: (.+)/gm, '"$1": $2'); // s6
    lniText = lniText.slice(0, lniText.length - 1); // remove head & foot "{" "}" added by "s4"
    // console.log(text)
    const objs = lniText.split('\n\n');
    const arrs = [];
    objs.forEach((obj, index, array) => {
      // console.log(index, obj)
      const opt = obj.trim().replace(/^\[([a-zA-Z0-9$-/:-?{-~!"^_`[\]]+)\]\n([\s\S]+)/gm, function(source, a, b) {
        const list = b.split('\n');
        // console.log(a)
        // console.log(`source\n${source}\na\n${a}\nb\n${b}`)
        for (let i = 0; i < list.length; i++) {
          const line = list[i];
          const last = line[line.length - 1];
          if (last != '[' && last != '{') {
            // console.log(`line ${i}: ${line}`)
          }
          // list[i] = line
        }
        b = list.join(',\n');
        b = b.replace(/,,/gm, ',').replace(/\[,/gm, '[').replace(/\{,/gm, '{').replace(/,\n\}/gm, '\n}').replace(/,\n\]/gm, '\n]');
        return `"${a}": {\n${b}\n}`;
      });
      // opt = opt.slice(0, opt.length - 1)
      // console.log(opt)
      arrs.push(opt);
    });
    lniText = arrs.join(',\n');
    lniText = `{\n${lniText}\n}`;
    lniText = lniText.replace(/\.\,/gm, ',');
    lniText = lniText.replace(/\.$/gm, '');
    lniText = lniText.replace(/^\n$/gm, '');

    // text = text.replace(/^(.+)$/gm, "$1\\n")
    // text = text.replace(/(\{|\})\\n/gm, "$1")
    // text = text.replace(/,\\n/gm, ",")
    // text = text.replace(/\[\\n/gm, "[")
    // text = text.replace(/\"\\n/gm, "\"")
    // text = text.replace(/\\n\n\}/gm, "\n}")
    // text = text.replace(/\\n\n\]/gm, "\n]")

    // fs.writeFileSync("C:/ability.json", text)

    // console.log(text)

    let json;
    try {
      json = JSON.parse(lniText);
    } catch (e) {
      jet.write('C:/LK/Logs/error.json', lniText);
      console.error('see error: ', 'C:/LK/Logs/error.json')
      throw e;
    }

    return json;
  }
  /**
   * @static
   * @param {any} obj
   * @return {string}
   * @memberof Lni
   */
  static obj2Lni(obj) {
    obj = orderObject(obj);

    const result = [];
    for (const gid in obj) {
      if (obj.hasOwnProperty(gid)) {
        const data = orderObject(obj[gid]);
        const propCount = Object.keys(data).length;
        if (gid.toString().length == 0) {
          console.error(data);
          throw Error('EMPTY GID');
        }
        if (propCount == 0) {
          console.error(gid);
          throw Error('EMPTY DATA');
        }

        result.push(`[${gid}]`);
        for (const fieldName in data) {
          if (data.hasOwnProperty(fieldName)) {
            const fieldValue = data[fieldName];
            if (fieldValue == null) {
              console.error(`${gid} - null field: ${fieldName}`);
              console.error(`data: `, data);
              console.trace('trace');
              throw Error('found null field');
            }
            if (fieldValue.constructor == Array) {
              result.push(`${fieldName} = {`);
              fieldValue.forEach((item) => {
                if (item == null) {
                  console.error('null array field item detected.');
                  console.error(`fieldName: ${fieldName}, value: ${fieldValue}`);
                  console.error(data, gid);
                  throw Error();
                }
                if (item.constructor == String) {
                  result.push(`${JSON.stringify(item)},`);
                } else if (item.constructor == Number) {
                  result.push(`${item},`);
                }
              });
              result.push(`}`);
            } else if (fieldValue.constructor == Object) {
              result.push(`${fieldName} = {`);
              for (const itemId in fieldValue) {
                if (fieldValue.hasOwnProperty(itemId)) {
                  const item = fieldValue[itemId];
                  if (item.constructor == String) {
                    result.push(`${itemId} = ${JSON.stringify(item)},`);
                  } else if (item.constructor == Number) {
                    result.push(`${itemId} = ${item},`);
                  }
                }
              }
              result.push(`}`);
            } else if (fieldValue.constructor == String) {
              result.push(`${fieldName} = ${JSON.stringify(fieldValue)}`);
            } else if (fieldValue.constructor == Number) {
              result.push(`${fieldName} = ${fieldValue}`);
            }
          }
        }
        result.push(``);
      }
    }
    const output = result.join('\r\n');
    return output;
  }
}

module.exports = LniUtil;
