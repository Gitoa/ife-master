window.onload = function () {
    var dragItems = document.querySelectorAll('[draggable=true]');
    var dragTargets = document.querySelectorAll('#box2, #box1');
    dragItems.forEach(function(dragItem) {
        dragItem.addEventListener('dragstart', function(event) {
            console.log('start drag.');
            dragTargets.forEach(function(dragTarget) {
                dragTarget.classList.add('dragging');
            });
            event.dataTransfer.effectAllowed = 'move';
            event.target.classList.add('onMove');
        })
        dragItem.addEventListener('drag', function(event) {
            
        })
        dragItem.addEventListener('dragend', function(event) {
            console.log('drag end', event.clientX);
            event.target.classList.remove('onMove');
            dragTargets.forEach(function(dragTarget){
                dragTarget.classList.remove('dragging');
            });
        })
    });
    dragTargets.forEach(function(dragTarget) {
        dragTarget.addEventListener('dragenter', function(event) {
            console.log('dragenter', event.offsetX);
            event.dataTransfer.dropEffect = 'move';
            event.preventDefault();
        })
        dragTarget.addEventListener('dragover', function(event) {
            event.preventDefault();
        })
        dragTarget.addEventListener('dragleave', function() {
            console.log('dragleave', event.offsetX);
        })
        dragTarget.addEventListener('drop', function(event) {
            var msg = event.dataTransfer.getData('text');
            console.log(msg);
            event.target.appendChild(document.querySelector('.onMove'));
            console.log('drop', event.offsetX);
        })
    });
}