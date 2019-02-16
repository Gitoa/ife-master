1.实现水平居中的方法，给定width，{margin:0 auto;},还可以{position:relative; left:50%; margin-left:-width/2;},添加一个父级块元素，设置成{text-align:center}。
2.不用border-radius实现圆角（css3特性可能未得到支持），类似微分，用三个矩形形成圆角。
3.两列布局，左侧宽度固定，右侧适应，可以1.左侧:{float:left} 2.左侧:{position:absolute}， 右侧:{margin-left:左侧宽度}
4.三列布局，圣杯布局与双飞翼布局，两侧固定，中间自适应。都利用了float:left让三者同一行，并且用不同的方式在middle两侧制造空间，通过margin-left负值调整left与right，圣杯布局还需要加上position:relative; left:-width的方式，双飞翼布局需要添加一个div元素。
5.清除浮动，.clearfix{overflow: auto;}，浮动导致的高度塌陷问题解决，BFC，HasLayout，.clearfix。
6.布局方式：传统的display + position + float，css3中的flexbox, grid需要学习一个。
7.margin-top的嵌套问题，解决办法。
8.替换元素以inline-block的形式在流中。