var STO;
function showImg(pos) {
    var imgList = $('#img-cycle img');
    var imgNavList = $('#img-nav span');
    imgList.forEach(function(imgElement, index) {
        if(index != pos) {
            imgElement.classList.remove('imgShow');
        } else {
            imgElement.classList.add('imgShow');
        }
    })
    imgNavList.forEach(function(navElement, index) {
        if(index != pos) {
            navElement.classList.remove('imgShow');
        } else {
            navElement.classList.add('imgShow');
        }
    })
}

function cycle(currentPos, isReverse, isCycle, timeOut) {
    showImg(currentPos);
    if(isReverse) {
        if(!isCycle && currentPos == 0) {
            return;
        }
        currentPos = (currentPos + 3) % 4;
    } else {
        if(!isCycle && currentPos == 3) {
            return;
        }
        currentPos = (currentPos + 1) % 4;
    }
    STO = setTimeout(function() {
        cycle(currentPos, isReverse, isCycle, timeOut)
    }, timeOut);
}
window.onload = function() {
    var initPos = 0;
    var timeOut = 2000;
    var isReverse = true;
    var isCycle = true;
    if(isReverse) {
        initPos = 3;
    }
    setTimeout(cycle(initPos, isReverse, isCycle, 2000), 0)
    var imgNav = document.querySelector('#img-nav');
    var spanNavList = Array.prototype.slice.apply(imgNav.childNodes);
    imgNav.addEventListener('click', function(event) {
        if(event.target.tagName.toLowerCase() == 'span'){
            clearTimeout(STO);
            var targetPos = spanNavList.indexOf(event.target)-1;
            console.log('pos', targetPos);
            cycle(targetPos, isReverse, isCycle, timeOut);
        }
    })
}
