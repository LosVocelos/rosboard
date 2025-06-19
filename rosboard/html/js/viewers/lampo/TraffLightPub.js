"use strict";

// GenericViewer just displays message fields and values in a table.
// It can be used on any ROS type.

class TraffLightPub extends Viewer {
  /**
    * Gets called when Viewer is first initialized.
    * @override
  **/
  onCreate() {
    this.viewerNode = $('<div></div>')
      .css({'font-size': '11pt', 'align-items': 'center', 'display': 'flex',
            'flex-direction': 'column', 'margin-bottom': '15px'})
      .appendTo(this.card.content);

    this.viewerNodeFadeTimeout = null;

    super.onCreate();

    let traffic_container = $('<div></div>')
      .addClass("traffic-lights-wrapper")
      .attr('id', 'trafficLightsWrapper')
      .appendTo(this.viewerNode);

    let btn = $('<button></button>')
      .text("Submit")
      .addClass("submit-btn")
      .on("click", function() {
        let lights_num = 0;
        let lights_ids = [];
        let lights_vals = [];
        console.log('--- Traffic Light States ---');
        $('.traffic-light-container').each(function(index) {
          lights_num += 1;
          lights_ids.push(Number($(this).attr("light_id")));

          let light_val = 0;
          $(this).children().each(function(color) {
            light_val += $(this).hasClass("has-circle") << color;
            $(this).children(':checkbox').prop('checked', false).trigger('change');
          });
          lights_vals.push(light_val);
        });
        currentTransport.send_plugin_message("traffic_lights",
            {num: lights_num, ids: lights_ids, lights: lights_vals});
      } )
      .appendTo(this.viewerNode);
  }

  onData(data) {
      this.card.title.text(data._topic_name);
      let num = data['num'].toString(10);
      let ids = data['ids'];
      let lights = data['lights'];

      for (let i = 0; i < num; i++) {
        let light_to_set = $("#trafficLightsWrapper").find(`[light_id='${ids[i]}']`);
        if (light_to_set.length == 0) {
          this.generateTrafficLight('trafficLightsWrapper', ids[i]);
        }
        $("#trafficLightsWrapper").find(`[light_id='${ids[i]}']`).children().each(function(color) {
          if (lights[i] & (1<<color)) {
            $(this).addClass("litup");
          } else {
            $(this).removeClass("litup");
          }
        })
      }
  }

  generateTrafficLight(containerId, instanceId) {
    // Generate unique IDs for the checkboxes within this instance
    const redId = `redLight-${instanceId}`;
    const yellowId = `yellowLight-${instanceId}`;
    const greenId = `greenLight-${instanceId}`;
    // Group checkboxes by name for radio-like behavior within this specific traffic light
    const nameAttr = `trafficLightGroup-${instanceId}`;

    const trafficLightHtml = `
        <div class="traffic-light-container" light_id=${instanceId}>
            ID = ${instanceId}
            <!-- Red Light -->
            <div class="traffic-light-bulb red">
                <input type="checkbox" id="${redId}" name="${nameAttr}" value="red">
                <label for="${redId}" class="traffic-light-label"></label>
                <div class="traffic-light-bulb-inner"></div>
            </div>

            <!-- Yellow Light -->
            <div class="traffic-light-bulb yellow">
                <input type="checkbox" id="${yellowId}" name="${nameAttr}" value="yellow">
                <label for="${yellowId}" class="traffic-light-label"></label>
                <div class="traffic-light-bulb-inner"></div>
            </div>

            <!-- Green Light -->
            <div class="traffic-light-bulb green">
                <input type="checkbox" id="${greenId}" name="${nameAttr}" value="green">
                <label for="${greenId}" class="traffic-light-label"></label>
                <div class="traffic-light-bulb-inner"></div>
            </div>
        </div>
    `;

    // Append the generated HTML to the specified container and get a reference to it
    const $newTrafficLightContainer = $(trafficLightHtml).appendTo(`#${containerId}`);

    // Apply the selection logic to this specific new traffic light instance
    this.setupTrafficLightLogic($newTrafficLightContainer);
  }

  // This function handles the logic for a single traffic light instance.
  // It ensures only one checkbox within its group is checked and toggles the circle.
  setupTrafficLightLogic($container) {
    $container.find('input[type="checkbox"]').on('change', function() {
      const $this = $(this);
      const isChecked = $this.is(':checked');
      const $parentBulb = $this.closest('.traffic-light-bulb');

      // If the current checkbox is checked, add 'has-circle' to its parent bulb
      if (isChecked) {
        $parentBulb.addClass('has-circle');
      } else {
        $parentBulb.removeClass('has-circle');
      }
    });
  }
}

TraffLightPub.friendlyName = "Lights data";

TraffLightPub.supportedTypes = [
    "lampo_interfaces/msg/TrafficLights",
];

Viewer.registerViewer(TraffLightPub);