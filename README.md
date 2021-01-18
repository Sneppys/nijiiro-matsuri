# nijiiro-matsuri

Discord application to run the Nijiiro Matsuri event on the Nijigasaki discord.

## Setup

Make sure you have `nodejs` and `npm` installed.

1. Clone the repository into a folder.
2. Run `npm install` in the repository folder.
3. Create a `bot.config.json` in the `src` directory by copying the `bot.config.example.json` example file and replacing the placeholder values with the values you want to use.
   - These parameters are only used for testing purposes, so use your own application if you wish. Remember that the application needs to be invited with both the `bot` and `applications.commands` scopes. [See here](https://discord.com/developers/docs/interactions/slash-commands#authorizing-your-application).
4. Run the application using `npm run dev`. This should restart if you make any changes to the source files.

## Other Info

- The `master` branch is protected and requires approval to merge in changes. Whatever is on there is automatically deployed to the main application. Merge into `develop` instead.
- A database (`storage.db`) will be created by the application, however it will not be updated with changes to existing models (by design). Deleting the file will let it regenerate with schema updates. I'll have to regenerate the database in production manually if any changes are made, however.
