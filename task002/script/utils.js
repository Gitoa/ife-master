function isArray(arr) {
    return arr instanceof Array;
}

function isFunction(fn) {
    return fn instanceof Function;
}

function cloneObject(src) {
    if (src instanceof Array) {
        var arr = [];
        for(let i=0, len=src.length; i<len; i++) {
            arr.push(cloneObject(src[i]));
        }
        return arr;
    } else if (src instanceof Object) {
        var obj = {};
        for(let i in src) {
            obj[i] = cloneObject(src[i]);
        }
        return obj;
    }
    return src;
}

function uniqArray(arr) {
    /*sort方法仅在可以排序（数字、字符串）的前提下才有用
    * arr.sort();
    * var i=0;
    * while(i < arr.length) {
    *     var j = i+1;
    *     while(j < arr.length) {
    *         if(arr[j] === arr[i]) {
    *             j++;
    *         } else {
    *             break;
    *         }
    *     }
    *     arr.splice(i, j-i-1);
    *     i = i+1;
    * }
    * return arr;
    */
    return arr.filter(function(element, index, array) {
        return element && array.indexOf(element) === index;
    })
    //es6:Set    return [...new Set(arr)];
}

function simpleTrim(str) {
    var l=0, r=str.length-1;
    while(l<str.length-1 && str[l] === ' ') {
        l++;
    }
    while(r>l && str[r] === ' ') {
        r--;
    }
    return str.substring(l, r+1);
}

function trim(str) {
    return str.replace(/(^\s*)|(\s*$)/g, '');
}

function each(arr, fn) {
    arr.forEach(function(val, index) {
        fn(val, index);
    });
}

function getObjectLength(obj) {
    var ans = 0;
    for(let i in obj) {
        ans ++;
    }
    return ans;
}

function isEmail(emailStr) {
    var pattern = /(https?:\/\/)?(www.)?\w+@\w+.\w+$/i;
    return pattern.test(emailStr);
}

function isMobilePhone(phone) {
    var pattern = /\d{11}/;
    return pattern.test(phone);
}

function addClass(element, newClassName) {
    if(!element.className) {
        element.className = newClassName;
    } else {
        element.className = element.className + ' ' + newClassName;
    }
}

function removeClass(element, oldClassName) {
    var arrClass = element.className.split(' ');
    var ind = arrClass.indexOf(oldClassName);
    if(ind != -1) {
        arrClass.splice(ind, 1);
    }
    element.className = arrClass.join(' ');
}

function isSiblingNode(element, siblingNode) {
    if(element.parentNode) {
        return element.parentNode.childNode.contains(siblingNode);
    }
    return false;
}

function getPosition(element) {
    var x = element.offsetTop;
    var y = element.offsetLeft;
    while(element.offsetParent != null) {
        x += element.offsetParent.offsetTop;
        y += element.offsetParent.offsetLeft;
        element = element.offsetParent;
    }
    return {x, y};
}

function $(selector) {
    /* 这个函数还有较大的问题，没有去重
    *  还不能实现多个条件的并列筛选
    */
    if(typeof selector != 'string') {
        throw 'invalid value'
    }
    var idPattern = /^#\w+/;
    var classPattern = /^\.\w+/;
    var attValPattern = /^\[\w+=w+\]&/;
    var attPattern = /^\[\w+\]$/;
    var list = selector.split(' ');
    var ans = [document];
    for(let i of list) {
        var tmpAns=[];
        if(idPattern.test(i)) {
            i = i.slice(1);
            for(let ele of ans) {
                if(ele.getElementById(i)) {
                    tmpAns.push(ele.getElementById(i));
                    break;
                }
            }
        } else if(classPattern.test(i)) {
            for(let ele of ans) {
                if(ele.getElementsByClassName(i)) {
                    tmpAns = tmpAns.concat(Array.prototype.slice.apply(ele.getElementsByClassName(i)));
                }
            }
        } else if(attValPattern.test(i)) {
            let [attr, val] = i.slice(1, i.length-1).splie('=');
            for(let ele of ans) {
                tmpAns = tmpAns.concat(getElementsByAttributeValue(ele, attr, val));
            }
        } else if(attPattern.test(i)) {
            i = i.slice(1, i.length-1);
            for(let ele of ans) {
                tmpAns = tmpAns.concat(getElementsByAttribute(ele, i));
            }
        } else {
            for(let ele of ans) {
                tmpAns = tmpAns.concat(Array.prototype.slice.apply(ele.getElementsByTagName(i)));
            }
        }
        ans = tmpAns;
        ans = uniqArray(ans);
    }
    function getElementsByAttribute(ele, attr) {
        var arr = [];
        for(let childEle of ele.childNode) {
            if(attr in childEle) {
                arr.push(childEle);
            }
            arr = arr.concat(getElementsByAttribute(childEle, attr));
        }
        return arr;
    }
    function getElementsByAttributeValue(ele, attr, val) {
        var arr = [];
        for(let childEle of ele.childNode) {
            if(childEle[attr] === val) {
                arr.push(childEle);
            }
            arr = arr.concat(getElementsByAttributeValue(childEle, attr, val));
        }
        return arr;
    }
    return ans;
}

function addEvent(element, event, listener) {
    element.addEventListener(event, listener, false);
}

function removeEvent(element, event, listener) {
    element.removeEventListener(event, listener, false);
}

function addClickEvent(element, listener) {
    element.addEventListener('click', listener, false);
    // dom 0: element.onclick = listener;
}

function addEnterEvent(element, listener) {
    element.addEventListener('keyup', function(event) {
        if(event.keyCode === 13) {
            listener(event);
        }
    }, false);
}

function delegateEvent(selector, tag, eventName, listener) {
    each($(selector), function(ele){
        console.log(ele);
        addEvent(ele, eventName, function(event) {
            if(event.target.tagName.toUpperCase() === tag.toUpperCase()) {
                listener(event.target);
            }
        });
    });
}

$.delegate = delegateEvent;

$.on = function(selector, event, listener) {
    each($(selector), function(ele) {
        addEvent(ele, event, listener);
    });
}

$.un = function(selector, event, listener) {
    each($(selector), function(ele) {
        removeEvent(ele, event, listener);
    });
}

$.click = function(selector, listener) {
    each($(selector), function(ele) {
        addClickEvent(ele, listener);
    });
}

$.enter = function(element, listener) {
    each(element, function(ele) {
        addEnterEvent(ele, listener);
    });
}

function clickListener(event) {
    console.log('type: '+event.type, 'target: '+event.target, 'currentTarget: '+event.currentTarget);
    console.log(event.target === event.currentTarget);
    console.log(this === event.target);
}

function isIE() {
    var nu = navigator.userAgent;
    var pattern = /MSIE ([^,]+)/
    if(!pattern.test(nu)) {
        return -1;
    } else {
        return RegExp.$1;
    }
}

function getCookie(name) {
    var cookieName = encodeURIComponent(name) + "=",
        cookieStart = document.cookie.indexOf(cookieName),
        cookieValue = null;
    if(cookieStart > -1) {
        var cookieEnd = document.cookie.indexOf(";", cookieStart);
        if(cookieEnd == -1) {
            cookieEnd = document.cookie.length;
        }
        cookieValue = decodeURIComponent(document.cookie.substring(cookieStart + cookieName.length, cookieEnd));
    }
    return cookieValue;
}

function setCookie(name, cookieValue, expiredays) {
    var cookieText = encodeURIComponent(name) + "=" + encodeURIComponent(cookieValue);

    if (expiredays instanceof Date) {
        cookieText += "; expires=" + expiredays.toGMTString();
    }
    document.cookie = cookieText;
}

function ajax(url, options) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if(readeystate == 4) {
            if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
                options.onsuccess.call(this, xhr.responseText);
            } else {
                options.onfail.call(this, xhr.responseText);
            }
        }
    }
    xhr.open(options.type, url, true);
    xhr.send(JSON.stringify(options.data));
}