export interface BootstrapBranch {
  id: string;
  name: string;
}

export interface BootstrapOrganization {
  id: string;
  name: string;
  slug: string;
  branches: BootstrapBranch[];
}
