function addLoadEvent(func) {
    console.log('here');
    let oldonload = window.onload;
    if(typeof window.onload != 'function') {
        console.log('not func')
        window.onload = function() {
            console.log('onload');
            func();
        };
    } else {
        window.onload = function() {
            oldonload();
            func();
        }
    }
}

function infinite() {
    let htmlEle = document.documentElement;
    let eleWidth = htmlEle.clientWidth;
    if(eleWidth > 1080) {
        htmlEle.style.fontSize = 42 + 'px'
    } else {
        htmlEle.style.fontSize = eleWidth / 1080 * 42 + 'px';
    }
}

function changeFont() {
    window.onresize = function() {
        console.log('alert'); 
        infinite();
    }
}

addLoadEvent(changeFont);