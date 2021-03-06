# Notifications

## Problem

User notification system in which a user can:

- Get notification when a test scenario is created/executed/delete
- See a list of notifications
- Enable/Disable notifications for event
- Mark notifications as read


## Notes

I created a simple example of how this would work and hosted it on [notifications.pech0rin.com](http://notifications.pech0rin.com). (Sorry the UI is so ugly!). The code that is running lives in this git repository.

There are a few things missing in the live example:
- Enable/Disable notifications
- User authentication/specific user delivery
- Enqueing messages to SQS or other worker queue

It is only meant as a example for the core concepts of the architecture.


## Architecture

The architecture is based on offloading the notifications to workers which in turn notify users.

### Database

Postgres schema with comments about indexes: [schema](https://github.com/sjohnson540/notification-service/blob/master/db/schema.sql)

The basic [models](https://github.com/sjohnson540/notification-service/blob/master/notifications/models.py) are:

- User
- TestScenario
- NotificationSubscription -- keeps track of what events users should be notified about
- Events -- stores the types of events users can be notified about [CREATE, EXECUTE, DELETE]
- Notification -- keeps track of events for specific test scenarios
- UserNotification -- keeps track of an individual notifications sent to users

The test data is seeded in this method: [data_setup](https://github.com/sjohnson540/notification-service/blob/master/notifications/models.py#L22)

### Application overview

- A new Event happens (CREATE, EXECUTE, DELETE) - usually in the [API controller](https://github.com/sjohnson540/notification-service/blob/master/notifications/controllers.py)
- [NotificationWorker](https://github.com/sjohnson540/notification-service/blob/master/notifications/workers/notification.py) message is enqueued to SQS given the event and test scenario.
- NotificationWorker pull message off SQS queue and checks the NotificationSubscription table to see who should be notified
- For every user subscription that matches we enqueue a [UserNotificiationWorker](https://github.com/sjohnson540/notification-service/blob/master/notifications/workers/user_notification.py) to SQS
- The UserNotificationWorkers pull messages off the SQS queue and create the UserNotification and would -- in practice -- send an email, slack message, sms, webhook or whatever method of sending we choose
- To mark messages as read we keep a boolean field on UserNotification -- which has an index so we can easily filter by that
- To enable/disable subscriptions all we need to do is create/delete NotificationSubscription entries. Old notifications would be preserved this way, but the user would not receive new notifications.

#### Pros

- De-coupling of test_scenarios and notifications. The execution/creation of test_scenarios is not affected by the creation of notifications. We do all of the notification handling in the background.

- Dedeplucation of data. The way the database tables are setup we don't duplicate any of the data for messages, events or subscriptions. This means its easy to add new events, scenarios, and subscription types without worrying about data inconsistancies

- Extensible. If we wanted to send emails, slack notifications, sms, we can add all that logic to the UserNotificationWorker and its happening behind the scenes without slowing down the main application.

#### Cons

- Not instantaneous notifications. Due to the fact that the notifications are sent to workers we run the risk of having a delay with notification delivery. We may want to batch the workers, so each worker grabs 20-30 messages off the queue and processes them at once.

- Deduplication of data requires some extra database joins that could be costly, even with correct indexes. We could store the message data directly into the UserNotification table, but then we would have duplicate data which may not be a tradeoff we want.

- Currently, the application creates the NotificationWorker inside the API controller. I would rather have a hook on the model for updates/creates/etc which creates the worker to clean up the controller.


### To Add

- API endpoints for a user to subscribe/unsubscribe from an event
- Currently the Workers are running straight away, but in practice the
  messages would be queued onto SQS and workers would be running to
  proccess the messages
- UI would have authentication which would restrict things to a user
- End-to-end testing