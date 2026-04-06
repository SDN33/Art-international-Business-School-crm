import { email, required, useTranslate } from "ra-core";
import type { FocusEvent, ClipboardEventHandler } from "react";
import { useFormContext } from "react-hook-form";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { BooleanInput } from "@/components/admin/boolean-input";
import { ReferenceInput } from "@/components/admin/reference-input";
import { TextInput } from "@/components/admin/text-input";
import { NumberInput } from "@/components/admin/number-input";
import { RadioButtonGroupInput } from "@/components/admin/radio-button-group-input";
import { SelectInput } from "@/components/admin/select-input";
import { ArrayInput } from "@/components/admin/array-input";
import { SimpleFormIterator } from "@/components/admin/simple-form-iterator";

import { isLinkedinUrl } from "../misc/isLinkedInUrl";
import type { Sale } from "../types";
import { Avatar } from "./Avatar";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";
import {
  contactGender,
  translateContactGenderLabel,
  translatePersonalInfoTypeLabel,
} from "./contactModel.ts";

export const ContactInputs = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col gap-2 p-1 relative md:static">
      <div className="absolute top-0 right-1 md:static">
        <Avatar />
      </div>
      <div className="flex gap-10 md:gap-6 flex-col md:flex-row">
        <div className="flex flex-col gap-10 flex-1">
          <ContactIdentityInputs />
          <ContactPositionInputs />
        </div>
        {isMobile ? null : (
          <Separator orientation="vertical" className="flex-shrink-0" />
        )}
        <div className="flex flex-col gap-10 flex-1">
          <ContactPersonalInformationInputs />
          <ContactMiscInputs />
        </div>
      </div>
      {isMobile ? null : <Separator className="my-2" />}
      <ContactLeadInputs />
    </div>
  );
};

const ContactIdentityInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("resources.contacts.field_categories.identity")}
      </h6>
      <RadioButtonGroupInput
        label={false}
        row
        source="gender"
        choices={contactGender}
        helperText={false}
        optionText={(choice) => translateContactGenderLabel(choice, translate)}
        translateChoice={false}
        optionValue="value"
        defaultValue={contactGender[0].value}
      />
      <TextInput source="first_name" validate={required()} helperText={false} />
      <TextInput source="last_name" validate={required()} helperText={false} />
    </div>
  );
};

const ContactPositionInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("resources.contacts.field_categories.position")}
      </h6>
      <TextInput source="title" helperText={false} />
      <ReferenceInput source="company_id" reference="companies" perPage={10}>
        <AutocompleteCompanyInput label="resources.contacts.fields.company_id" />
      </ReferenceInput>
    </div>
  );
};

const ContactPersonalInformationInputs = () => {
  const translate = useTranslate();
  const { getValues, setValue } = useFormContext();
  const personalInfoTypes = [
    {
      id: "Work",
      name: translatePersonalInfoTypeLabel("Work", translate),
    },
    {
      id: "Home",
      name: translatePersonalInfoTypeLabel("Home", translate),
    },
    {
      id: "Other",
      name: translatePersonalInfoTypeLabel("Other", translate),
    },
  ];

  // set first and last name based on email
  const handleEmailChange = (email: string) => {
    const { first_name, last_name } = getValues();
    if (first_name || last_name || !email) return;
    const [first, last] = email.split("@")[0].split(".");
    setValue("first_name", first.charAt(0).toUpperCase() + first.slice(1));
    setValue(
      "last_name",
      last ? last.charAt(0).toUpperCase() + last.slice(1) : "",
    );
  };

  const handleEmailPaste: ClipboardEventHandler<
    HTMLTextAreaElement | HTMLInputElement
  > = (e) => {
    const email = e.clipboardData?.getData("text/plain");
    handleEmailChange(email);
  };

  const handleEmailBlur = (
    e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const email = e.target.value;
    handleEmailChange(email);
  };

  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("resources.contacts.field_categories.personal_info")}
      </h6>
      <ArrayInput source="email_jsonb" helperText={false}>
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="email"
            className="w-full"
            helperText={false}
            label={false}
            placeholder={translate("resources.contacts.fields.email")}
            validate={email()}
            onPaste={handleEmailPaste}
            onBlur={handleEmailBlur}
          />
          <SelectInput
            source="type"
            helperText={false}
            label={false}
            optionText="name"
            choices={personalInfoTypes}
            defaultValue="Work"
            className="w-24 min-w-24"
          />
        </SimpleFormIterator>
      </ArrayInput>
      <ArrayInput source="phone_jsonb" helperText={false}>
        <SimpleFormIterator
          inline
          disableReordering
          disableClear
          className="[&>ul>li]:border-b-0 [&>ul>li]:pb-0"
        >
          <TextInput
            source="number"
            className="w-full"
            helperText={false}
            label={false}
            placeholder={translate("resources.contacts.fields.phone_number")}
          />
          <SelectInput
            source="type"
            helperText={false}
            label={false}
            optionText="name"
            choices={personalInfoTypes}
            defaultValue="Work"
            className="w-24 min-w-24"
          />
        </SimpleFormIterator>
      </ArrayInput>
      <TextInput
        source="linkedin_url"
        helperText={false}
        validate={isLinkedinUrl}
      />
    </div>
  );
};

const ContactMiscInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">
        {translate("resources.contacts.field_categories.misc")}
      </h6>
      <TextInput source="background" multiline helperText={false} />
      <BooleanInput source="has_newsletter" helperText={false} />
      <ReferenceInput
        reference="sales"
        source="sales_id"
        sort={{ field: "last_name", order: "ASC" }}
        filter={{
          "disabled@neq": true,
        }}
      >
        <SelectInput
          helperText={false}
          optionText={saleOptionRenderer}
          validate={required()}
        />
      </ReferenceInput>
    </div>
  );
};

const saleOptionRenderer = (choice: Sale) =>
  `${choice.first_name} ${choice.last_name}`;

const PIPELINE_STATUS_CHOICES = [
  { id: "Nouveau lead", name: "Nouveau lead" },
  { id: "Contacté WA", name: "Contacté WA" },
  { id: "À rappeler", name: "À rappeler" },
  { id: "Qualifié", name: "Qualifié" },
  { id: "Qualifié AFDAS", name: "Qualifié AFDAS" },
  { id: "Inscrit", name: "Inscrit" },
  { id: "Converti", name: "Converti" },
  { id: "Perdu", name: "Perdu" },
];

const ORIGINE_CHOICES = [
  { id: "Site web", name: "Site web" },
  { id: "Instagram", name: "Instagram" },
  { id: "WhatsApp", name: "WhatsApp" },
  { id: "Facebook", name: "Facebook" },
  { id: "Recommandation", name: "Recommandation" },
  { id: "Salon", name: "Salon" },
  { id: "Événement", name: "Événement" },
  { id: "Autre", name: "Autre" },
];

const ContactLeadInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <h6 className="text-lg font-semibold">Informations Lead</h6>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SelectInput
          source="pipeline_status"
          label="Statut pipeline"
          choices={PIPELINE_STATUS_CHOICES}
          helperText={false}
          emptyText="Aucun"
          emptyValue=""
        />
        <TextInput
          source="formation_souhaitee"
          label="Formation souhaitée"
          helperText={false}
        />
        <SelectInput
          source="origine_lead"
          label="Origine du lead"
          choices={ORIGINE_CHOICES}
          helperText={false}
          emptyText="Aucune"
          emptyValue=""
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NumberInput
          source="valeur_estimee"
          label="Valeur estimée (€)"
          helperText={false}
        />
        <TextInput
          source="lien_calendly"
          label="Lien Calendly"
          helperText={false}
        />
        <TextInput
          source="formation_slug"
          label="Slug formation"
          helperText={false}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BooleanInput
          source="calendly_reserved"
          label="Calendly réservé"
          helperText={false}
        />
        <BooleanInput
          source="qualification_bot"
          label="Qualifié bot"
          helperText={false}
        />
        <BooleanInput
          source="reponse_relance_email"
          label="Réponse email"
          helperText={false}
        />
        <BooleanInput
          source="reponse_relance_wa"
          label="Réponse WA"
          helperText={false}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TextInput
          source="utm_source"
          label="UTM Source"
          helperText={false}
        />
        <TextInput
          source="utm_medium"
          label="UTM Medium"
          helperText={false}
        />
        <TextInput
          source="utm_campaign"
          label="UTM Campaign"
          helperText={false}
        />
      </div>
    </div>
  );
};
