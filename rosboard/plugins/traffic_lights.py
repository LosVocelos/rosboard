#!/usr/bin/env python3

import os
import pathlib
import sys

sys.path.append(f"{pathlib.Path(__file__).parent.resolve()}/.")
if os.environ.get("ROS_VERSION") == "1":
    import rospy  # ROS1
elif os.environ.get("ROS_VERSION") == "2":
    import rosboard.rospy2 as rospy  # ROS2
else:
    print("ROS not detected. Please source your ROS environment\n(e.g. 'source /opt/ros/DISTRO/setup.bash')")
    exit(1)

from lampo_interfaces.msg import TrafficLights


class TrafficLightsPlugin:

    def __init__(self):
        self.publisher = rospy.Publisher('traf_lights', TrafficLights)

    def receive(self, message):
        msg = TrafficLights()
        msg.num = message["num"]
        msg.ids = message["ids"]
        msg.lights = message["lights"]

        rospy.loginfo(str(msg))

        self.publisher.publish(msg)



# This is the most important function for all plugins,
# it's called when a message from the client is sent towards the backend
def receive(message):
    global _instance
    if _instance == None:
        _instance = TrafficLightsPlugin()

    _instance.receive(message)

_instance = None

# Add all javascript files which are needed for this plugin on the client side:
# e.g. "js/plugins/dummy.js", "js/viewer/dummy.js"
# From client side use the javascript function, like this:
# currentTransport.send_plugin_message("dummy", "myImportantMessage"})
# currentTransport.send_plugin_message("dummy", {myKey: "myImportantMessage"})
js_files = ["js/viewers/lampo/TraffLightPub.js"]