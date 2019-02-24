//记录任务信息，包括任务分类，任务文件，任务内容，仅作演示，不使用本地存储
var taskClass = new Map()
var taskFile = new Map();
var taskContent = new Map();

taskClass = ['任务分类1', '任务分类2', '任务分类3'];

taskFile.set('/任务分类1/',['任务1', '任务2', '任务3']);
taskFile.set('/任务分类2/',['任务1', '任务2', '任务3']);
taskFile.set('/任务分类3/',['任务1', '任务2', '任务3']);

taskContent.set('/任务分类1/任务1/', {'name':'任务1', 'date':'2019-02-11', 'content':'任务1/1的具体描述，任务1/1的具体描述'});
taskContent.set('/任务分类1/任务2/', {'name':'任务2', 'date':'2019-02-11', 'content':'任务1/2的具体描述，任务1/2的具体描述'});
taskContent.set('/任务分类1/任务3/', {'name':'任务3', 'date':'2019-02-11', 'content':'任务1/3的具体描述，任务1/3的具体描述'});

taskContent.set('/任务分类2/任务1/', {'name':'任务1', 'date':'2019-02-11', 'content':'任务2/1的具体描述，任务2/1的具体描述'});
taskContent.set('/任务分类2/任务2/', {'name':'任务2', 'date':'2019-02-11', 'content':'任务2/2的具体描述，任务2/2的具体描述'});
taskContent.set('/任务分类2/任务3/', {'name':'任务3', 'date':'2019-02-11', 'content':'任务2/3的具体描述，任务2/3的具体描述'});

taskContent.set('/任务分类3/任务1/', {'name':'任务1', 'date':'2019-02-11', 'content':'任务3/1的具体描述，任务3/1的具体描述'});
taskContent.set('/任务分类3/任务2/', {'name':'任务2', 'date':'2019-02-11', 'content':'任务3/2的具体描述，任务3/2的具体描述'});
taskContent.set('/任务分类3/任务3/', {'name':'任务3', 'date':'2019-02-11', 'content':'任务3/3的具体描述，任务3/3的具体描述'});

//保存路径信息，返回时使用
var preHash;

//页面初始
function showTaskClass() {  //显示todo，隐藏返回，显示任务分类列表
    document.querySelector('.back').classList.remove('show');
    document.querySelector('header>p').innerHTML = 'to do';
    var boxElement = document.querySelector('div.box');
    boxElement.innerHTML ='';
    var ulElement = document.createElement('ul');
    for(let taskClassName of taskClass) {
        let liElement = document.createElement('li');
        let aElement = document.createElement('a');
        aElement.href = `#/${taskClassName}/`
        aElement.innerHTML = `<p>${taskClassName}</p>`;
        liElement.appendChild(aElement);
        ulElement.appendChild(liElement);
    }
    boxElement.appendChild(ulElement);
}

function showTaskFile(path) {
    let taskFiles = taskFile.get(path);
    let boxElement = document.querySelector('div.box');
    let ulElement = document.createElement('ul');
    for(let taskFile of taskFiles) {  //先准备好显示内容
        let liElement = document.createElement('li');
        let aElement = document.createElement('a');
        aElement.href = `#${path}${taskFile}/`;
        aElement.innerHTML = `<p>${taskFile}`;
        liElement.appendChild(aElement);
        ulElement.appendChild(liElement);
    }
    //对原内容进行改变，并添加应该显示的内容
    document.querySelector('header>p').innerHTML = path.split('/')[1];
    let backButton = document.querySelector('div.back');
    backButton.classList.add('show');
    backButton.firstElementChild.href = '#/'
    boxElement.innerHTML ='';
    boxElement.appendChild(ulElement);
}

function showTaskContent(path) {
    let content = taskContent.get(path);
    let boxElement = document.querySelector('div.box');
    let backButton = document.querySelector('div.back');
    backButton.classList.add('show');
    document.querySelector('header>p').innerHTML = path.split('/')[2];
    backButton.firstElementChild.href = '#' + path.slice(0, path.lastIndexOf('/', path.length-2)) + '/';
    boxElement.innerHTML = `<div class='taskName'><p>${content['name']}</p></div>
                            <div class='taskDate'><p>${content['date']}</p></div>
                            <div class='taskContent'><p>${content['content']}</p></div>`

}

function initOnload() {
    showTaskClass();
    //监听hash变化
    window.addEventListener('hashchange', function(event) {
        let hash = decodeURIComponent(window.location.hash).slice(1);
        console.log(hash);
        console.log(hash.match(/\//g).length);
        switch (hash.match(/\//g).length) {
            case 1 : 
                showTaskClass();
                break;
            case 2 :
                showTaskFile(hash);
                break;
            case 3 :
                showTaskContent(hash);
                break;
            default:
                showTaskClass();
        }
    })
}

addLoadEvent(initOnload);

