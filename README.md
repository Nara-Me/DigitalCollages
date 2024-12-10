Digital Collages

This project creates a digital space for the creation of live collages througth a camera input. It makes a detection of a few objects and highlights them, allowing for the placement of a choosen image on top. This image will follow the object if it is moved and can be permanetly applied to the space if the user decides to.

Installation

The only installation necessary is the download of repository files.

Usage

First, use a code editor that can create a local live server to run the code (VS Code for example);
After opening the project online, click the enable camera button after it becomes available. This can take some time because the object detection model needs to load first;
When there is video capture from the camera, make sure there are objects from this list that can be detected. People are detectable and good to ensure everything is working;
Clicking on one of the detected objects (highlited with a bounding box) opens a menu with images to chose from. Selecting one will place it on top of the object.
There are two modes - Replace and Collage. On the replace mode, selecting a different image to an object that already had one merely replaces it with the new one. The collage mode permanently places the old image on the canvas and no longer updates its position relating to the object. 

License

    This project is licensed under the Apache License, Version 2.0 - see the LICENSE file for details.

Credits

Google LLC
Jason Mayes

This project is developed in the context of a course in the MSc of Design and Multimedia of the University of Coimbra.

Contributors

    Margarida Mendonça - design and development
    João Cunha - supervision
    Sérgio M. Rebelo - supervision
    Tiago Martins - supervision
