from app.models.salon import Salon


def test_salon_membership_relationship_cascades_orphans():
    cascade = Salon.user_memberships.property.cascade
    assert cascade.delete is True
    assert cascade.delete_orphan is True
