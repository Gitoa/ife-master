/*var defaultFolderPath = '/';  //添加文件夹时的默认父节点
var defaultFilePath = '默认分类';  //添加文件时的默认父节点
var topFolder = ['默认分类', 'baidu'];  //顶级文件夹名称，与‘默认分类’同级
var pathData = new Map();  //key为完整路径，包含文件夹、文件、任务，文件夹对应value为数组，文件对应value为以时间为key的Map，任务对应的是类，包含名称时间内容,type表示分类，0文件夹，1文件，2任务
var tmpTasksMap = new Map();
tmpTasksMap.set('2018-02-11', [{name:'todo 1', done:true}, {name:'todo 2', done:false}]);
pathData.set('默认分类',[{name:'aloha', type:1}, {name:'ohu', type:1}, {name:'osu', type:1}]);
pathData.set('baidu', [{name:'aloha', type:1}, {name:'ohu', type:1}, {name:'osu', type:0}]);
pathData.set('baidu/osu', [{name:'task1', type:1}, {name:'task2', type:1}]);
pathData.set('baidu/ohu', tmpTasksMap);
pathData.set('baidu/ohu/todo 1',{name:'todo 1', date:'2018-02-11', content:'nothing to say', done:false});
tasksByDate = new Map();  //显示文件中的任务，需要按照日期归类
tasksByDate = tmpTasksMap;
currentTaskContent = {name:'todo 1', date:'2018-02-11', content:'nothing to say'};
var currentFolder = defaultFolderPath;  //表示当前在哪个文件夹下
var currentFile = '';  //表示当前在访问哪个文件内容
var database;*/
let initPathData = new Map();
initPathData.set('/',{tasksNum:0, content:[]});

var config = {
    topFolder: [],     
    database: {},
    defaultFilePath: '默认分类',
    folderOfFile: '',  //当前操作文件所在目录
    currentFolder: '/',  //当前访问文件夹(将在该文件夹下添加文件夹)
    addFilePath: '默认分类',    //将在该文件夹下添加文件
    currentFileName: '',//当前文件名称
    tasksByDate: new Map(),   //当前文件下的任务集合，是key为date的Map
    taskName: '',       //当前访问任务名
    taskInfo: {},       //当前任务的所有信息
    taskNode:  '',      //当前访问任务对应的节点
    folderOrFileNode:'',//当前访问的文件或者文件夹节点
    filesInFolder:[],   //currentFolder下的文件/文件夹名集合
    filesInFilePath:[],  //addFilePath下的文件/文件夹名集合,需要初始化
    tasksInFile: [],     //当前文件下的所有任务名称,用来判断新增任务是否重名
    preTaskContent: '',  //未修改前任务内容
    pathData: new Map(initPathData), //{taskNum: taskNum, content:[{},{}]}
    updateCount: {         //用来触发更新，Vue无法绑定Map和Set
        count: 1
    }  
};
var indexedDB = window.indexedDB || window.msIndexedDB || window.webkitIndexedDb || window.mozIndexedDB;

function initListener() {
    //在分类列表中点击
    document.querySelector('#filesByClass').addEventListener('click', async function(event){
        await classClick(event, config);
    }, false)
    //点击了任务
    document.querySelector('#tasksInFileMain').addEventListener('click', function(event) {
        taskClick(event, config);
    }, false)
    //添加文件夹
    document.querySelector('#addFolder').addEventListener('click', async function(event) {
        let folderName = prompt('请输入文件夹名称');
        if(folderName && !(/\s+/g.test(folderName))) {  //判别文件名有效以及是否重复
            if(config.filesInFolder.indexOf(folderName) !== -1) {
                alert('名称已存在')
            } else {
                await addClass(config, folderName);
            }
        } else {
            alert('请输入有效名称')
        }
    }, false)
    //添加文件
    document.querySelector('#addFile').addEventListener('click', async function(event) {
        let fileName = prompt('请输入文件名称');
        if(fileName && !(/\s+/g.test(fileName))) {
            if(config.filesInFilePath.indexOf(fileName) !== -1) {
                alert('名称已存在')
            } else {
                await addFile(config, fileName);
            }
        } else {
            alert('请输入有效名称')
        }
    }, false)
    //添加任务
    document.querySelector('#addTask').addEventListener('click', async function(event) {
        if(config.folderOfFile && config.pathData.has(config.folderOfFile+'/'+config.currentFileName)) {
            let taskName = prompt('请输入任务名称');
            if(taskName) {
                if(config.tasksInFile.indexOf(taskName)!==-1) {
                    alert('名称已存在');
                } else {
                    let taskDate = prompt('请输入日期');
                    if(validDate(taskDate)) {
                        await addTask(config, taskName, taskDate);
                    } else {
                        alert('日期格式错误')
                    }
                }
            } else {
                alert('请输入有效名称')
            }
        } else {
            alert('请选择目标文件')
        }
    }, false)
    //提交任务
    document.querySelector('#submit').addEventListener('click', async function(event) {
        let taskName = document.querySelector('#taskName').innerHTML;
        let taskDate = document.querySelector('#taskDate').value;
        let taskContent = document.querySelector('#taskContent').value;
        await submitTask(config, taskName, taskDate, taskContent);
    }, false)
    document.querySelector('#cancel').addEventListener('click', function(event) {
        cancelTask(config);
    }, false)
    //确认完成
    document.querySelector('#checkTask').addEventListener('click', async function(event) {
        await checkTask(config)
    }, false)
    //进入编辑
    document.querySelector('#editTask').addEventListener('click', function(event) {
        activeEdit();
    }, false)
}

async function initTopFolder() {
    let top = await readData(config.database, '/');
    config.topFolder = top.content.map(function(item) {
        return item.name;
    })
}

window.onload = async function() {
    new Promise((resolve, reject)=> {
        initDB('planB', 0, resolve, config);
    }).then(async function() {
        await initTopFolder();
    }).then(async function() {
        for(let topfolder of config.topFolder) {
            await updatePathData(config.database, config.pathData, topfolder, 0);
        }
        initConfig(config);
        config.updateCount.count += 1;
        config.updateCount.count %= 100;
    }).then(function() {
        initListener()
    })
}