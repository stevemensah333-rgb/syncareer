import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone, Mail, Linkedin } from 'lucide-react';

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
}

export const CVFormPersonal: React.FC<CVFormPersonalProps> = ({ data, onChange }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Personal Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={data.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={data.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              placeholder="+233 00 000 0000"
              value={data.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              placeholder="Ghanaian"
              value={data.nationality}
              onChange={(e) => onChange({ nationality: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Personal Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@gmail.com"
              value={data.email}
              onChange={(e) => onChange({ email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schoolEmail">School Email</Label>
            <Input
              id="schoolEmail"
              type="email"
              placeholder="john.doe@ashesi.edu.gh"
              value={data.schoolEmail}
              onChange={(e) => onChange({ schoolEmail: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedIn" className="flex items-center gap-2">
            <Linkedin className="h-4 w-4" />
            LinkedIn Profile URL
          </Label>
          <Input
            id="linkedIn"
            placeholder="https://linkedin.com/in/johndoe"
            value={data.linkedIn}
            onChange={(e) => onChange({ linkedIn: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
};
