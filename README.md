Freeflow app

The auth part of the code 
if the uxer

Authentication of the app
FoodFlow uses HTTP Basic Authentication to protect its API routes. Users register with a username and password, and the server hashes passwords with bcrypt before storing them in PostgreSQL. Each protected request sends credentials in the Authorization header. The server verifies the account so customers can view their own orders and restaurant owners can manage orders and menus for their restaurants.

How the servers work.
FoodFlow’s Express server runs on port 3000. It receives API requests, checks the input and permissions, then reads or updates data in PostgreSQL. It returns JSON responses for browsing restaurants and menus, placing and tracking orders, and managing restaurant menus.

