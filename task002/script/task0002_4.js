var suggestData = ['Simon', 'Erik', 'Kener'];

function addLoadEvent(func) {
    var oldLoad = window.onload;
    if(typeof oldLoad == 'function') {
        window.onload = function() {
            oldLoad();
            func();
        }
    } else {
        window.onload = func;
    }
}

window.onload = function() {
    var input = $('#container input')[0];
    var hintBox = $('#hint')[0];
    var hintList = $('#hint ul')[0];
    for(let suggestHint of suggestData) {
        var li = document.createElement('li');
        li.innerHTML = suggestHint;
        hintList.appendChild(li);
    }
    window.addEventListener('click', function(event) {
        console.log(event.target);
        if(input.contains(event.target)) {
            hintBox.classList.add('show');
        } else {
            hintBox.classList.remove('show');
        }
        if(hintList.contains(event.target)) {
            if(event.target.tagName.toLowerCase() == 'li'){
                input.value = event.target.innerHTML;
            }
        }
        if(event.target.tagName.toLowerCase() == 'button') {
            var searchText = input.value;
            if(suggestData.indexOf(searchText) == -1) {
                suggestData.push(searchText);
                var tmpLi = document.createElement('li');
                tmpLi.innerHTML = searchText;
                hintList.appendChild(tmpLi);
            }
        }
    })
}   