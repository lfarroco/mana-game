


The world is a messy place. We can imagine our application running as cartoon fight scene, with the characters engulfed in a dust cloud, exchanging punches and kicks, throwing pies. 
With that in mind, think how you could monitor and control the scene.
Adding a deeply nested tree of events and callbacks would make it hard to follow the action. Even worse - it could be come part of the dust cloud, and you would have no idea what is going on.
To have a clear view of what is going on, here we have a few guidelines:
- Something happens: an event is emitted
- The event has a unique name and a small payload
- Any side effects that may affect the dust cloud are handled outside the dust cloud
- This means that when something happens, an event is emitted and nothing else
- When doing this you might notice that an action might be broken down into multiple events
- This is good, because it makes it easier to follow the action
- And you are documenting the flow of your application

An example:
We have an rts game.
When two units collide, we want to stop our current scene and show a battle scene.
In the first approach (callback tree), we would have something like this:
- Unit A collides with Unit B, a callback is called
- Scene A stops, Scene B starts
- Scene B does its thing
- Scene B stops, Scene A starts
- Game resumes
If all that is being done functions that call other functions, you get a chain of callbacks that is hard to follow.
Even worse, that code might live in the original scene, making it hard to reuse (and giving it too much responsibility).

Another way of accomplishing the same thing is:
- Unit A collides with Unit B, an event is emitted
- Unit A emits a "collided" event with Unit B as payload
- The game stops the current scene and starts the battle scene
- The battle scene does its thing
- The battle scene stops and emits a "battle_finished" event
- The game stops the battle scene and resumes the game

All the code that handles the events is in the game, and the game is responsible for handling the events.