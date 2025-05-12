"use strict";

// GenericViewer just displays message fields and values in a table.
// It can be used on any ROS type.

class LampoMapViewer extends Viewer {
  /**
    * Gets called when Viewer is first initialized.
    * @override
  **/
  onCreate() {
    this.card.title.text("LampoMapViewer");
    this.viewerNode = $('<div></div>')
      .css({'font-size': '11pt'})
      .appendTo(this.card.content);

    this.viewerNodeFadeTimeout = null;

    this.expandFields = { };
    this.fieldNodes = { };
    this.dataTable = $('<table></table>')
          .addClass('mdl-data-table')
          .addClass('mdl-js-data-table')
          .css({'width': '100%', 'min-height': '30pt', 'table-layout': 'fixed' })
          .appendTo(this.viewerNode);

    super.onCreate();

    var fields = ['size (px)', 'size (tiles)', 'roads'];
    // this.road_tiles = " ╵╶└╷│┌├╴┘─┴┐┤┬┼";
    this.road_tiles = " ╵╶╚╷║╔╠╴╝═╩╗╣╦╬";
    for (let f in fields) {
        let tr = $('<tr></tr>')
          .appendTo(this.dataTable);
        $('<td></td>')
          .addClass('mdl-data-table__cell--non-numeric')
          .text(fields[f])
          .css({'width': '40%', 'font-weight': 'bold', 'overflow': 'hidden', 'text-overflow': 'ellipsis'})
          .appendTo(tr);
        this.fieldNodes[f] = $('<td></td>')
          .addClass('mdl-data-table__cell--non-numeric')
          .addClass('monospace')
          .css({'overflow': 'hidden', 'text-overflow': 'ellipsis'})
          .appendTo(tr);
    }
  }

  onData(data) {
      this.fieldNodes[0]
        .text(data['height'].toString(10) + 'x' + data['width'].toString(10));
      this.fieldNodes[1]
        .text(data['tiles_y'].toString(10) + 'x' + data['tiles_x'].toString(10));
      var text = "";
      for (let i in data['roads']) {
          if (i%data['tiles_x'] == 0 && i != 0) {
              text += '<br>';
          }
          text += this.road_tiles[data['roads'][i]];
      }
      this.fieldNodes[2][0].innerHTML = (text);
      this.fieldNodes[2].css("line-height", 1.2);
  }
}

LampoMapViewer.friendlyName = "Rendered data";

LampoMapViewer.supportedTypes = [
    "lampo_interfaces/msg/Map",
];

Viewer.registerViewer(LampoMapViewer);