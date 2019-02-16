function toRest(time) {
    var secRest = time%60;
    time = parseInt(time/60);
    var minRest = time%60;
    time = parseInt(time/60);
    var hourRest = time%24;
    time = parseInt(time/24);
    return [time, hourRest, minRest, secRest];
}
window.onload = function() {
    var eleDay = document.getElementById('days');
    var eleHour = document.getElementById('hours');
    var eleMinute = document.getElementById('minutes');
    var eleSecond = document.getElementById('seconds');
    var timeoutObj;
    function updateTime(targetTime) {
        var timeRest = parseInt((targetTime - Date.now()) / 1000);
        if(timeRest > 0) {
            [dayRest, hourRest, minRest, secRest] = toRest(timeRest);
            eleDay.innerHTML = dayRest;
            eleHour.innerHTML = hourRest;
            eleMinute.innerHTML = minRest;
            eleSecond.innerHTML = secRest;  
            timeoutObj = setTimeout(function(){
                updateTime(targetTime);
            }, 1000)
        }
    }
    document.getElementsByTagName('button')[0].addEventListener('click', function(){
        if(timeoutObj){
            clearTimeout(timeoutObj);
        }
        var time = document.getElementsByTagName('input')[0].value;
        var [year, month, day] = time.split('-');
        var targetDate = new Date(parseInt(year), parseInt(month)-1, parseInt(day));
        var targetTime = targetDate.getTime();
        document.getElementsByTagName('p')[0].innerHTML = "距离" + year + "年" + month + "月" + day + "日还有:";
        updateTime(targetTime);
    }, false)
}