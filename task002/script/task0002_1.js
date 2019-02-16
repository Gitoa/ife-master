function step1() {
    var arr = $('input')[0].value.split(',');
    arr = arr.map(function(val) {
        return trim(val);
    })
    arr = uniqArray(arr);
    var str = arr.join(',');
    var pNode = document.createElement('p');
    pNode.appendChild(document.createTextNode(str));
    document.getElementById('container').appendChild(pNode);
}
function step2() {
    var originStr = $('#multi-input')[0].value;
    console.log(originStr);
    var arr = originStr.split(/[\s;、,\n;]+/g);
    console.log(arr);
    arr = arr.map(function(val) {
        return trim(val);
    })
    arr = uniqArray(arr);
    if(arr.length == 0 || arr.length > 10) {
        alert('1~10 hobbies!')
    } else {
        var container = $('#container')[0];
        var checkbox;
        var label;
        var boxId;
        var i=1;
        for(let hobby of arr) {
            checkbox = document.createElement('input');
            checkbox.type = "checkbox";
            checkbox.id = "checkbox" + i;
            label = document.createElement('label');
            label.setAttribute('for', checkbox.id);
            label.appendChild(document.createTextNode(hobby));
            container.appendChild(checkbox);
            container.appendChild(label);
            i ++;
        }
    }
}
window.onload = function () {
    
    var btn1 = $('#btn1')[0];
    var btn2 = $('#btn2')[0];
    btn1.addEventListener('click', step1);
    btn2.addEventListener('click', step2);
}