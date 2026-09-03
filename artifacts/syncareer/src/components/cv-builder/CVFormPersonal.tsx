import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Linkedin, Globe } from 'lucide-react';

interface PersonalData {
  firstName: string;
  lastName: string;
  phone: string;
  nationality: string;
  email: string;
  schoolEmail: string;
  linkedIn: string;
}

interface CVFormPersonalProps {
  data: PersonalData;
  onChange: (data: Partial<PersonalData>) => void;
  errors?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export const CVFormPersonal: React.FC<CVFormPersonalProps> = ({ data, onChange, errors = {} }) => {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <User className="h-4 w-4 text-primary" aria-hidden="true" />
          Personal & Contact Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName" className="text-xs font-medium">
              First Name <span className="text-destructive" aria-hidden>*</span>
            </Label>
            <Input
              id="firstName"
              placeholder="e.g. Kwame"
              value={data.firstName}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
              onChange={(e) => onChange({ firstName: e.target.value })}
              className="rounded-input"
            />
            {errors.firstName && (
              <p id="firstName-error" className="text-xs font-medium text-destructive" role="alert">
                {errors.firstName}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
            <Input
              id="lastName"
              placeholder="e.g. Mensah"
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              className="rounded-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-medium">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="+233 24 000 0000"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className="rounded-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nationality" className="flex items-center gap-1.5 text-xs font-medium">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Nationality / Location
            </Label>
            <Input
              id="nationality"
              placeholder="e.g. Ghanaian · Accra, Ghana"
              value={data.nationality}
              onChange={(e) => onChange({ nationality: e.target.value })}
              className="rounded-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Personal Email <span className="text-destructive" aria-hidden>*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="kwame.mensah@gmail.com"
              value={data.email}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              onChange={(e) => onChange({ email: e.target.value })}
              className="rounded-input"
            />
            {errors.email && (
              <p id="email-error" className="text-xs font-medium text-destructive" role="alert">
                {errors.email}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="schoolEmail" className="flex items-center gap-1.5 text-xs font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              Institutional / University Email
            </Label>
            <Input
              id="schoolEmail"
              type="email"
              placeholder="kwame.mensah@ashesi.edu.gh"
              value={data.schoolEmail}
              onChange={(e) => onChange({ schoolEmail: e.target.value })}
              className="rounded-input"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="linkedIn" className="flex items-center gap-1.5 text-xs font-medium">
            <Linkedin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            LinkedIn Profile URL
          </Label>
          <Input
            id="linkedIn"
            placeholder="https://linkedin.com/in/kwamemensah"
            value={data.linkedIn}
            onChange={(e) => onChange({ linkedIn: e.target.value })}
            className="rounded-input"
          />
        </div>
      </CardContent>
    </Card>
  );
};
