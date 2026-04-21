import { HttpClient } from "./http";
import { ContactsResource } from "./resources/contacts";
import { TagsResource } from "./resources/tags";
import type { MaildeskOptions } from "./types";

export class Maildesk {
  public readonly contacts: ContactsResource;
  public readonly tags: TagsResource;

  constructor(options: MaildeskOptions) {
    const http = new HttpClient(options);
    this.contacts = new ContactsResource(http);
    this.tags = new TagsResource(http);
  }
}
