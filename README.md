## Flaut Anomaly <img src="https://github.com/JamesJGoodwin/flaut-anomaly/workflows/build/badge.svg" alt="actions-badge" />
... was developed exclusively to meet <a href="https://www.flaut.ru" target="_blank">Flaut.ru</a>'s marketing requirements. What it does is described by the illustration below -
it converts messages from <a href="https://bot.aviasales.ru/" target="_blank">Aviasales bot of abnormally low prices</a> in Facebook to an image and posts it to VK.com social network group page.

<div style="display: flex; justify-content: center;">
  <img src="https://github.com/JamesJGoodwin/flaut-anomaly/blob/master/github-process-description-image.png" alt="process description" />
</div>

It has 3 main stages:
1. Read a message and parse the URL it contains
2. Prepare the image using `service.prerender.cloud/screenshot`
3. Post image to VK.com with corresponding description and direct link to the search page with a ticket

It also has web dashboard which keeps you up to date about what's going on at the server. Built with JWT and WebSocket makes it blazing fast, secure and real-time.

## TODO
- User management and access rights (upload images, modify users, etc)
- Refactor typing for websocket data flow
