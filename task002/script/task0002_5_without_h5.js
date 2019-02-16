function moveCopy(event) {
    offsetX = event.clientX - preX;
    offsetY = event.clientY - preY;
    preX = event.clientX;
    preY = event.clientY;
    copyBox.style.left = parseInt(copyBox.style.left) + offsetX + 'px';
    copyBox.style.top = parseInt(copyBox.style.top) + offsetY + 'px';
}

var copyBox,
    preX, preY,
    offsetX, offsetY,
    copyTarget;

window.onload = function() {
    var box1 = document.querySelector('#box1');
    var box2 = document.querySelector('#box2');
    var container = document.querySelector('#container');
    box1.addEventListener('mousedown', function(event) {
        if(event.target.className.toLowerCase() == 'item' &&
            event.target.id.toLowerCase() != 'box1') {
                originBox = 'box1';
                copyTarget = event.target;
                copyBox = event.target.cloneNode();
                copyBox.style = "position:absolute";
                copyBox.style.left = event.target.offsetLeft + 'px';
                copyBox.style.top = event.target.offsetTop + 'px';
                event.target.style.visibility = 'hidden';
                preX = event.clientX;
                preY = event.clientY;
                container.appendChild(copyBox);
                container.addEventListener('mousemove', moveCopy);
        }
    })
    container.addEventListener('mouseup', function(event) {
        console.log(event.target);
        if(originBox && originBox == 'box1' && event.target.id == 'box2') {
            box1.removeChild(copyTarget);
            box2.appendChild(copyTarget);
        } else if(originBox && originBox == 'box2' && event.target.id == 'box1'){
            box2.removeChild(copyTarget);
            box1.appendChild(copyTarget);
        } else {
            if(copyTarget) {
                copyTarget.style.visibility = '';
            }
        }
        container.removeEventListener('mousemove', moveCopy);
        if(copyBox) {
            container.removeChild(copyBox);
        }
        copyBox = null;
        copyTarget = null;
        originBox = null;
    })
}