import urllib2
import time
import serial
import json

ser = serial.Serial('/dev/ttyACM0', 9600)

def makeCoffee(timer):
    print timer
    if(timer == None):
        print 'Making Coffee'
        ser.write("1")
        x = urllib2.urlopen("https://coffeebot123.herokuapp.com/done").read()
        print x

    while(timer > 0):
        timer = timer - 1
        print timer
        time.sleep(1)
        if(timer == 1):
            print 'Making Coffee'
            ser.write("1")
            x = urllib2.urlopen("https://coffeebot123.herokuapp.com/done").read()
            print x
while(1):
    x = urllib2.urlopen("https://coffeebot123.herokuapp.com/action").read()

    try:
        data = json.loads(x)
        if( x == '{"numOfDocs":0}'):
            print 'Waiting..'
            ser.write("0")
        else:
            makeCoffee(data['duration'])
        time.sleep(3)
    except ValueError, e:
        y = e
