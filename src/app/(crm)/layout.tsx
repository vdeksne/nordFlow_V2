import { AiAssistantDock } from "@/components/Crm/AiAssistant";
import { AppSidebar } from "@/components/Crm/AppSidebar";
import { CompaniesProvider } from "@/components/Crm/CompaniesContext";
import { ContactsProvider } from "@/components/Crm/ContactsContext";
import { CustomersProvider } from "@/components/Crm/CustomersContext";
import { DealsProvider } from "@/components/Crm/DealsContext";
import { LeadsProvider } from "@/components/Crm/LeadsContext";
import { MobileNav } from "@/components/Crm/MobileNav";
import { GoalsProvider } from "@/components/Crm/GoalsContext";
import { HealthProvider } from "@/components/Crm/HealthContext";
import { ProfileProvider } from "@/components/Crm/ProfileContext";
import { ProjectsProvider } from "@/components/Crm/ProjectsContext";
import { TasksProvider } from "@/components/Crm/TasksContext";

export default function CrmLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CustomersProvider>
      <CompaniesProvider>
        <ContactsProvider>
          <ProfileProvider>
            <LeadsProvider>
              <DealsProvider>
                <TasksProvider>
                  <ProjectsProvider>
                    <GoalsProvider>
                      <HealthProvider>
                        <div className="flex min-h-screen">
                        <div className="hidden w-[260px] shrink-0 lg:block">
                          <div className="border-sidebar-border fixed inset-y-0 left-0 w-[260px] border-r border-white/[0.04]">
                            <AppSidebar />
                          </div>
                        </div>
                        <div className="bg-background flex min-h-screen flex-1 flex-col">
                          <MobileNav />
                          {children}
                        </div>
                      </div>
                      <AiAssistantDock />
                      </HealthProvider>
                    </GoalsProvider>
                  </ProjectsProvider>
                </TasksProvider>
              </DealsProvider>
            </LeadsProvider>
          </ProfileProvider>
        </ContactsProvider>
      </CompaniesProvider>
    </CustomersProvider>
  );
}
